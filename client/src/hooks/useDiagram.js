import { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { useNavigate } from 'react-router-dom';

export const useDiagram = (diagramId) => {
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch diagram data
  useEffect(() => {
    const fetchDiagram = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`/api/diagrams/${diagramId}`);
        setDiagram(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load diagram');
        if (err.response?.status === 404) {
          navigate('/404');
        }
      } finally {
        setLoading(false);
      }
    };

    if (diagramId) {
      fetchDiagram();
    }
  }, [diagramId, navigate]);

  // Update diagram
  const updateDiagram = async (updates) => {
    try {
      setError(null);
      const response = await axios.patch(`/api/diagrams/${diagramId}`, updates);
      setDiagram(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update diagram');
      throw err;
    }
  };

  // Share diagram
  const shareDiagram = async (isPublic) => {
    try {
      setError(null);
      const response = await axios.post(`/api/diagrams/${diagramId}/share`, { isPublic });
      setDiagram(response.data.diagram);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update sharing settings');
      throw err;
    }
  };

  // Add collaborator
  const addCollaborator = async (userId, role = 'viewer') => {
    try {
      setError(null);
      const response = await axios.post(`/api/diagrams/${diagramId}/collaborators`, {
        userId,
        role,
      });
      setDiagram(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add collaborator');
      throw err;
    }
  };

  // Remove collaborator
  const removeCollaborator = async (userId) => {
    try {
      setError(null);
      const response = await axios.delete(`/api/diagrams/${diagramId}/collaborators/${userId}`);
      setDiagram(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove collaborator');
      throw err;
    }
  };

  // Delete diagram
  const deleteDiagram = async () => {
    try {
      setError(null);
      await axios.delete(`/api/diagrams/${diagramId}`);
      navigate('/');
    } catch (err) {
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