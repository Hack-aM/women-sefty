import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { getContacts, addContact, updateContact, deleteContact } from '../firebase/firestore';
import toast from 'react-hot-toast';

export const useContacts = () => {
  const { user } = useAuth();
  const { contacts, setContacts } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    const maxRetries = 3;
    let success = false;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SafeHer useContacts] Loading contacts... (Attempt ${attempt}/${maxRetries})`);
        const data = await getContacts(user.uid);
        if (!Array.isArray(data)) {
          throw new Error('Invalid contacts data received');
        }
        setContacts(data);
        success = true;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[SafeHer useContacts] Attempt ${attempt} failed:`, err.message || err);
        if (attempt < maxRetries) {
          const delay = attempt * 800; // backoff delay
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!success) {
      setError(lastError?.message || 'Failed to load contacts');
      toast.error('Failed to load contacts. Tap to retry.');
    }
    setLoading(false);
  }, [user, setContacts]);

  const addNewContact = async (contact) => {
    if (!user) return;
    setError(null);
    let success = false;
    let id = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        id = await addContact(user.uid, contact);
        success = true;
        break;
      } catch (err) {
        console.warn(`[SafeHer useContacts] addContact attempt ${attempt} failed:`, err);
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (success) {
      setContacts([{ id, ...contact }, ...contacts]);
      toast.success('Contact added!');
      return id;
    } else {
      toast.error('Failed to add contact. Please try again.');
    }
  };

  const editContact = async (contactId, data) => {
    if (!user) return;
    setError(null);
    let success = false;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await updateContact(user.uid, contactId, data);
        success = true;
        break;
      } catch (err) {
        console.warn(`[SafeHer useContacts] updateContact attempt ${attempt} failed:`, err);
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (success) {
      setContacts(contacts.map((c) => (c.id === contactId ? { ...c, ...data } : c)));
      toast.success('Contact updated!');
    } else {
      toast.error('Failed to update contact. Please try again.');
    }
  };

  const removeContact = async (contactId) => {
    if (!user) return;
    setError(null);
    let success = false;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await deleteContact(user.uid, contactId);
        success = true;
        break;
      } catch (err) {
        console.warn(`[SafeHer useContacts] deleteContact attempt ${attempt} failed:`, err);
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (success) {
      setContacts(contacts.filter((c) => c.id !== contactId));
      toast.success('Contact removed');
    } else {
      toast.error('Failed to remove contact. Please try again.');
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchContacts(); }, [user]);

  return { contacts, loading, error, fetchContacts, addNewContact, editContact, removeContact };
};
