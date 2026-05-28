import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { getContacts, addContact, updateContact, deleteContact } from '../firebase/firestore';
import toast from 'react-hot-toast';

export const useContacts = () => {
  const { user } = useAuth();
  const { contacts, setContacts } = useApp();
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getContacts(user.uid);
      setContacts(data);
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [user, setContacts]);

  const addNewContact = async (contact) => {
    if (!user) return;
    try {
      const id = await addContact(user.uid, contact);
      setContacts([{ id, ...contact }, ...contacts]);
      toast.success('Contact added!');
      return id;
    } catch {
      toast.error('Failed to add contact');
    }
  };

  const editContact = async (contactId, data) => {
    if (!user) return;
    try {
      await updateContact(user.uid, contactId, data);
      setContacts(contacts.map((c) => (c.id === contactId ? { ...c, ...data } : c)));
      toast.success('Contact updated!');
    } catch {
      toast.error('Failed to update contact');
    }
  };

  const removeContact = async (contactId) => {
    if (!user) return;
    try {
      await deleteContact(user.uid, contactId);
      setContacts(contacts.filter((c) => c.id !== contactId));
      toast.success('Contact removed');
    } catch {
      toast.error('Failed to remove contact');
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchContacts(); }, [user]);

  return { contacts, loading, fetchContacts, addNewContact, editContact, removeContact };
};
