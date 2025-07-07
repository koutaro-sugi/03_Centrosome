// React Hook for UAS Ports

import { useState, useEffect } from 'react';
import { uasPortAPI } from '../lib/uasPortApi';
import { UASPort, CreateUASPortInput, UpdateUASPortInput } from '../types/uasport';

export const useUASPorts = () => {
  const [ports, setPorts] = useState<UASPort[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all UAS Ports
  const loadPorts = async () => {
    setLoading(true);
    setError(null);
    try {
      const portList = await uasPortAPI.listAll();
      setPorts(portList);
    } catch (err) {
      setError('Failed to load UAS ports');
      console.error('Error loading UAS ports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new UAS Port
  const createPort = async (input: CreateUASPortInput): Promise<UASPort | null> => {
    setError(null);
    try {
      const newPort = await uasPortAPI.create(input);
      await loadPorts(); // Reload the list
      return newPort;
    } catch (err: any) {
      setError(err.message || 'Failed to create UAS port');
      console.error('Error creating UAS port:', err);
      return null;
    }
  };

  // Update a UAS Port
  const updatePort = async (input: UpdateUASPortInput): Promise<UASPort | null> => {
    setError(null);
    try {
      const updatedPort = await uasPortAPI.update(input);
      await loadPorts(); // Reload the list
      return updatedPort;
    } catch (err) {
      setError('Failed to update UAS port');
      console.error('Error updating UAS port:', err);
      return null;
    }
  };

  // Delete a UAS Port
  const deletePort = async (uaport_code: string): Promise<boolean> => {
    setError(null);
    try {
      await uasPortAPI.delete(uaport_code);
      await loadPorts(); // Reload the list
      return true;
    } catch (err) {
      setError('Failed to delete UAS port');
      console.error('Error deleting UAS port:', err);
      return false;
    }
  };

  // Get a specific port by code
  const getPort = async (uaport_code: string): Promise<UASPort | null> => {
    try {
      return await uasPortAPI.get(uaport_code);
    } catch (err) {
      console.error('Error getting UAS port:', err);
      return null;
    }
  };

  // Load ports on mount
  useEffect(() => {
    loadPorts();
  }, []);

  return {
    ports,
    loading,
    error,
    loadPorts,
    createPort,
    updatePort,
    deletePort,
    getPort,
  };
};