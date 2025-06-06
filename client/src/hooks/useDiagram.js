import { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { useNavigate } from 'react-router-dom';

export const useDiagram = (diagramId) => {
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Validate diagram ID
  const isValidId = (id) => {
    return id && typeof id === 'string' && id !== ':id' && id.length > 0;
  };

  // Fetch diagram data
  useEffect(() => {
    const fetchDiagram = async () => {
      if (!isValidId(diagramId)) {
        setError('Invalid diagram ID');
        setLoading(false);
        navigate('/404');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`/api/diagrams/${encodeURIComponent(diagramId)}`);
        setDiagram(response.data);
      } catch (err) {
        console.error('Error fetching diagram:', err);
        setError(err.response?.data?.error || 'Failed to load diagram');
        if (err.response?.status === 404) {
          navigate('/404');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDiagram();
  }, [diagramId, navigate]);

  // Update diagram
  const updateDiagram = async (updates) => {
    if (!isValidId(diagramId)) {
      throw new Error('Invalid diagram ID');
    }

    try {
      setError(null);
      const response = await axios.patch(`/api/diagrams/${encodeURIComponent(diagramId)}`, updates);
      setDiagram(response.data);
      return response.data;
    } catch (err) {
      console.error('Error updating diagram:', err);
      setError(err.response?.data?.error || 'Failed to update diagram');
      throw err;
    }
  };

  // Share diagram by adding collaborator
  const shareDiagram = async ({ email, role }) => {
    if (!isValidId(diagramId)) {
      throw new Error('Invalid diagram ID');
    }

    try {
      setError(null);
      // Resolve email to userId
      const resolveResponse = await axios.post('/api/users/resolve-email', { email });
      const userId = resolveResponse.data.userId;
      // Add collaborator
      const response = await axios.post(`/api/diagrams/${encodeURIComponent(diagramId)}/collaborators`, {
        userId,
        role,
      });
      setDiagram(response.data);
      return response.data;
    } catch (err) {
      console.error('Error sharing diagram:', err);
      setError(err.response?.data?.error || 'Failed to share diagram');
      throw err;
    }
  };

  // Add collaborator
  const addCollaborator = async (userId, role = 'viewer') => {
    if (!isValidId(diagramId)) {
      throw new Error('Invalid diagram ID');
    }

    try {
      setError(null);
      const response = await axios.post(`/api/diagrams/${encodeURIComponent(diagramId)}/collaborators`, {
        userId,
        role,
      });
      setDiagram(response.data);
      return response.data;
    } catch (err) {
      console.error('Error adding collaborator:', err);
      setError(err.response?.data?.error || 'Failed to add collaborator');
      throw err;
    }
  };

  // Remove collaborator
  const removeCollaborator = async (userId) => {
    if (!isValidId(diagramId)) {
      throw new Error('Invalid diagram ID');
    }

    try {
      setError(null);
      const response = await axios.delete(`/api/diagrams/${encodeURIComponent(diagramId)}/collaborators/${encodeURIComponent(userId)}`);
      setDiagram(response.data);
      return response.data;
    } catch (err) {
      console.error('Error removing collaborator:', err);
      setError(err.response?.data?.error || 'Failed to remove collaborator');
      throw err;
    }
  };

  // Delete diagram
  const deleteDiagram = async () => {
    if (!isValidId(diagramId)) {
      throw new Error('Invalid diagram ID');
    }

    try {
      setError(null);
      await axios.delete(`/api/diagrams/${encodeURIComponent(diagramId)}`);
      navigate('/');
    } catch (err) {
      console.error('Error deleting diagram:', err);
      setError(err.response?.data?.error || 'Failed to delete diagram');
      throw err;
    }
  };

  return {
    diagram,
    loading,
    error,
    updateDiagram,
    shareDiagram,
    addCollaborator,
    removeCollaborator,
    deleteDiagram,
  };
}; 