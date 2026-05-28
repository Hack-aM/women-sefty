import { useState } from 'react';
import { saveIncidentReport } from '../firebase/firestore';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function useIncidentReport() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const submitReport = async (data) => {
    if (!user) {
      toast.error('You must be logged in to submit a report');
      return null;
    }
    setSubmitting(true);
    try {
      const reportId = await saveIncidentReport(user.uid, data);
      toast.success('Incident reported successfully 🛡️');
      return reportId;
    } catch (err) {
      console.error('Error submitting report:', err);
      toast.error('Failed to submit report. Please try again.');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return { submitReport, submitting };
}
