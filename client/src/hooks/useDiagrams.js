import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export const useDiagrams = () => {
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all diagrams
  useEffect(() => {
    const fetchDiagrams = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('/api/diagrams');
        setDiagrams(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load diagrams');
      } finally {
        setLoading(false);
      }
    };

    fetchDiagrams();
  }, []);

  // Create new diagram
  const createDiagram = async (data) => {
    try {
      setError(null);
      const response = await axios.post('/api/diagrams', data);
      setDiagrams((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create diagram');
      throw err;
    }
  };

  // Delete diagram
  const deleteDiagram = async (diagramId) => {
    try {
      setError(null);
      await axios.delete(`/api/diagrams/${diagramId}`);
      setDiagrams((prev) => prev.filter((d) => d._id !== diagramId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete diagram');
      throw err;
    }
  };

  // Update diagram
  const updateDiagram = async (diagramId, updates) => {
    try {
      setError(null);
      const response = await axios.patch(`/api/diagrams/${diagramId}`, updates);
      setDiagrams((prev) =>
        prev.map((d) => (d._id === diagramId ? response.data : d))
      );
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update diagram');
      throw err;
    }
  };

  return {
    diagrams,
    loading,
    error,
    createDiagram,
    deleteDiagram,
    updateDiagram,
  };
}; 