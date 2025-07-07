import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import { Add, Edit, Delete, LocationOn } from '@mui/icons-material';
import { useUASPorts } from '../hooks/useUASPorts';
import { CreateUASPortInput, UpdateUASPortInput } from '../types/uasport';
import { initialUASPorts, initializeUASPortsInDB } from '../scripts/initializeUASPorts';

export const UASPortManagement: React.FC = () => {
  const { ports, loading, error, createPort, updatePort, deletePort } = useUASPorts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<CreateUASPortInput>({
    uaport_code: '',
    common_name: '',
    full_address: '',
    location: { lat: 0, lon: 0 },
    status: 'ACTIVE',
  });
  const [editingCode, setEditingCode] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleOpenDialog = (editPort?: any) => {
    if (editPort) {
      setEditMode(true);
      setEditingCode(editPort.uaport_code);
      setFormData({
        uaport_code: editPort.uaport_code,
        common_name: editPort.common_name,
        full_address: editPort.full_address,
        location: { ...editPort.location },
        status: editPort.status,
      });
    } else {
      setEditMode(false);
      setFormData({
        uaport_code: '',
        common_name: '',
        full_address: '',
        location: { lat: 0, lon: 0 },
        status: 'ACTIVE',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setEditingCode('');
  };

  const handleSubmit = async () => {
    try {
      if (editMode) {
        const updateData: UpdateUASPortInput = {
          uaport_code: editingCode,
          common_name: formData.common_name,
          full_address: formData.full_address,
          location: formData.location,
          status: formData.status,
        };
        await updatePort(updateData);
        setSnackbar({ open: true, message: 'UAS Port updated successfully', severity: 'success' });
      } else {
        await createPort(formData);
        setSnackbar({ open: true, message: 'UAS Port created successfully', severity: 'success' });
      }
      handleCloseDialog();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save UAS Port', severity: 'error' });
    }
  };

  const handleDelete = async (code: string) => {
    if (window.confirm(`Are you sure you want to delete port ${code}?`)) {
      const success = await deletePort(code);
      if (success) {
        setSnackbar({ open: true, message: 'UAS Port deleted successfully', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Failed to delete UAS Port', severity: 'error' });
      }
    }
  };

  const handleInitialize = async () => {
    if (window.confirm('This will initialize all default UAS Ports. Continue?')) {
      await initializeUASPortsInDB(createPort);
      setSnackbar({ open: true, message: 'UAS Ports initialized successfully', severity: 'success' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">UAS Port Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {ports.length === 0 && (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<LocationOn />}
              onClick={handleInitialize}
            >
              Initialize Default Ports
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add New Port
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Port Code</TableCell>
              <TableCell>Common Name</TableCell>
              <TableCell>Full Address</TableCell>
              <TableCell>Coordinates</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ports.map((port) => (
              <TableRow key={port.uaport_code}>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {port.uaport_code}
                  </Typography>
                </TableCell>
                <TableCell>{port.common_name}</TableCell>
                <TableCell>{port.full_address}</TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {port.location.lat.toFixed(6)}, {port.location.lon.toFixed(6)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={port.status}
                    color={port.status === 'ACTIVE' ? 'success' : port.status === 'INACTIVE' ? 'default' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenDialog(port)} color="primary">
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(port.uaport_code)} color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit UAS Port' : 'Create New UAS Port'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Port Code"
              value={formData.uaport_code}
              onChange={(e) => setFormData({ ...formData, uaport_code: e.target.value.toUpperCase() })}
              disabled={editMode}
              helperText="Unique 4-letter code (e.g., UNAG)"
              required
            />
            <TextField
              label="Common Name"
              value={formData.common_name}
              onChange={(e) => setFormData({ ...formData, common_name: e.target.value })}
              helperText="Display name in Japanese (e.g., 長崎)"
              required
            />
            <TextField
              label="Full Address"
              value={formData.full_address}
              onChange={(e) => setFormData({ ...formData, full_address: e.target.value })}
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Latitude"
                type="number"
                value={formData.location.lat}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, lat: parseFloat(e.target.value) || 0 }
                })}
                required
              />
              <TextField
                label="Longitude"
                type="number"
                value={formData.location.lon}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, lon: parseFloat(e.target.value) || 0 }
                })}
                required
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};