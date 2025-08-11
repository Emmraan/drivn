'use client';

import React, { useState, useEffect} from 'react';
import { motion } from 'framer-motion';
import {
  CogIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/SkeletonLoader';

interface SchemaField {
  name: string;
  type: 'String' | 'Number' | 'Boolean' | 'Date' | 'ObjectId' | 'Array' | 'Mixed';
  required: boolean;
  default?: string | number | boolean | Date | null;
  unique?: boolean;
  index?: boolean;
  description?: string;
}

interface ModelSchema {
  modelName: string;
  fields: SchemaField[];
  timestamps: boolean;
}

const AVAILABLE_MODELS = [
  'User',
  'File',
  'Folder',
  'Admin',
];

const FIELD_TYPES = [
  { value: 'String', label: 'String', description: 'Text data' },
  { value: 'Number', label: 'Number', description: 'Numeric data' },
  { value: 'Boolean', label: 'Boolean', description: 'True/false values' },
  { value: 'Date', label: 'Date', description: 'Date and time' },
  { value: 'ObjectId', label: 'ObjectId', description: 'MongoDB ObjectId reference' },
  { value: 'Array', label: 'Array', description: 'Array of values' },
  { value: 'Mixed', label: 'Mixed', description: 'Any type of data' },
];

export default function UpdateSchemaPage() {
  const [selectedModel, setSelectedModel] = useState<string>('User');
  const [currentSchema, setCurrentSchema] = useState<ModelSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // New field form state
  const [newField, setNewField] = useState<SchemaField>({
    name: '',
    type: 'String',
    required: false,
    description: '',
  });

  useEffect(() => {
    loadModelSchema();
  }, [selectedModel]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadModelSchema = async () => {
    // Only show loading state on first load
    if (!currentSchema) {
      setLoading(true);
    }
    
    try {
      const response = await fetch(`/api/admin/schema/${selectedModel}`);
      const data = await response.json();

      if (data.success) {
        setCurrentSchema(data.schema);
      } else {
        setNotification({
          type: 'error',
          message: data.message || 'Failed to load schema',
        });
      }
    } catch (error) {
      console.error('Error loading schema:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load schema. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    if (!newField.name.trim()) {
      setNotification({
        type: 'error',
        message: 'Field name is required',
      });
      return;
    }

    if (currentSchema?.fields.some((f) => f.name === newField.name)) {
      setNotification({
        type: 'error',
        message: 'Field name already exists',
      });
      return;
    }

    const updatedSchema = {
      ...currentSchema!,
      fields: [...currentSchema!.fields, { ...newField }],
    };

    setCurrentSchema(updatedSchema);
    setNewField({
      name: '',
      type: 'String',
      required: false,
      description: '',
    });
    setShowAddField(false);

    setNotification({
      type: 'success',
      message: 'Field added successfully. Remember to save changes.',
    });
  };

  const handleDeleteField = (fieldName: string) => {
    if (!confirm(`Are you sure you want to delete the field "${fieldName}"? This action cannot be undone.`)) {
      return;
    }

    const updatedSchema = {
      ...currentSchema!,
      fields: currentSchema!.fields.filter((f) => f.name !== fieldName),
    };

    setCurrentSchema(updatedSchema);
    setNotification({
      type: 'success',
      message: 'Field deleted successfully. Remember to save changes.',
    });
  };

  const handleSaveSchema = async () => {
    if (!currentSchema) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/schema/${selectedModel}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentSchema),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({
          type: 'success',
          message: 'Schema updated successfully!',
        });
      } else {
        setNotification({
          type: 'error',
          message: data.message || 'Failed to update schema',
        });
      }
    } catch (error) {
      console.error('Error saving schema:', error);
      setNotification({
        type: 'error',
        message: 'Failed to save schema. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <CogIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Schema Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage database model schemas
            </p>
          </div>
        </div>
        <Card className="p-6">
          <TableSkeleton rows={8} columns={6} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CogIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Schema Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Add, update, or delete fields from database models
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model} value={model}>
                {model} Model
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`p-4 rounded-lg flex items-center space-x-3 glass backdrop-blur-md ${
            notification.type === 'success'
              ? 'border-green-200 dark:border-green-800'
              : notification.type === 'warning'
              ? 'border-yellow-200 dark:border-yellow-800'
              : 'border-red-200 dark:border-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
          ) : notification.type === 'warning' ? (
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          )}
          <p className={`text-sm font-medium ${
            notification.type === 'success'
              ? 'text-green-800 dark:text-green-200'
              : notification.type === 'warning'
              ? 'text-yellow-800 dark:text-yellow-200'
              : 'text-red-800 dark:text-red-200'
          }`}>
            {notification.message}
          </p>
          <button
            onClick={() => setNotification(null)}
            className={`ml-auto text-sm underline ${
              notification.type === 'success'
                ? 'text-green-700 dark:text-green-300'
                : notification.type === 'warning'
                ? 'text-yellow-700 dark:text-yellow-300'
                : 'text-red-700 dark:text-red-300'
            }`}
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Warning Notice */}
      <Card className="p-4 border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            <p className="font-medium mb-1">⚠️ Caution: Schema Modifications</p>
            <p>
              Modifying database schemas can affect existing data and application functionality.
              Always backup your database before making changes and test thoroughly in a development environment.
            </p>
          </div>
        </div>
      </Card>

      {/* Current Schema */}
      {currentSchema && (
        <Card className="overflow-hidden" padding="none">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentSchema.modelName} Model Schema
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {currentSchema.fields.length} fields • Timestamps: {currentSchema.timestamps ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddField(true)}
                  leftIcon={<PlusIcon className="h-4 w-4" />}
                >
                  Add Field
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSchema}
                  loading={saving}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Field Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Properties
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentSchema.fields.map((field, index) => (
                  <motion.tr
                    key={field.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {field.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {field.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {field.required && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Required
                          </span>
                        )}
                        {field.unique && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            Unique
                          </span>
                        )}
                        {field.index && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Indexed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {field.description || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<PencilIcon className="h-4 w-4" />}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteField(field.name)}
                          leftIcon={<TrashIcon className="h-4 w-4" />}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Field Modal */}
      {showAddField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 dark:border-gray-700/50"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add New Field
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Field Name *
                  </label>
                  <input
                    type="text"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    placeholder="e.g., phoneNumber"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Field Type *
                  </label>
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField({ ...newField, type: e.target.value as SchemaField['type'] })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newField.description}
                    onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                    placeholder="Describe what this field is used for..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Field Properties
                  </label>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="required"
                      checked={newField.required}
                      onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="required" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Required field
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="unique"
                      checked={newField.unique || false}
                      onChange={(e) => setNewField({ ...newField, unique: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="unique" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Unique values only
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="index"
                      checked={newField.index || false}
                      onChange={(e) => setNewField({ ...newField, index: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="index" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Create database index
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddField(false);
                    setNewField({
                      name: '',
                      type: 'String',
                      required: false,
                      description: '',
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAddField}
                >
                  Add Field
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
