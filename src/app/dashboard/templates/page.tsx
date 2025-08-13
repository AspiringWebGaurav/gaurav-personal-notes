'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { TEMPLATES, TEMPLATE_CATEGORIES, searchTemplates, getTemplatesByCategory } from '@/lib/templates';

export default function TemplatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTemplateType, setSelectedTemplateType] = useState<'notes' | 'money'>('notes');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  // Filter templates by type first, then by search/category
  const templatesByType = selectedTemplateType === 'notes'
    ? TEMPLATES.filter(template => template.type !== 'money')
    : TEMPLATES.filter(template => template.type === 'money');

  const filteredTemplates = searchQuery
    ? templatesByType.filter(template =>
        template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : selectedCategory === 'All'
    ? templatesByType
    : templatesByType.filter(template => template.category === selectedCategory);

  const useTemplate = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template?.type === 'money') {
      const trackerId = `money_${Date.now()}`;
      router.push(`/dashboard/money/${trackerId}?template=${templateId}`);
    } else {
      const noteId = `note_${Date.now()}`;
      router.push(`/dashboard/notes/${noteId}?template=${templateId}`);
    }
  };

  const goBack = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={goBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Go back to dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-xl">📋</span>
                <h1 className="text-lg font-medium text-gray-900">Templates</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Choose a Template
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Get started quickly with our collection of 30+ professionally designed templates
            for notes, money tracking, planning, and productivity.
          </p>
        </motion.div>

        {/* Template Type Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <div className="flex justify-center">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => {
                  setSelectedTemplateType('notes');
                  setSelectedCategory('All');
                }}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                  selectedTemplateType === 'notes'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📝 Notes Templates
              </button>
              <button
                onClick={() => {
                  setSelectedTemplateType('money');
                  setSelectedCategory('All');
                }}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                  selectedTemplateType === 'money'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                💰 Money Tracker Templates
              </button>
            </div>
          </div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {['All', ...TEMPLATE_CATEGORIES.filter(cat => {
                // Show relevant categories based on selected template type
                if (selectedTemplateType === 'notes') {
                  return !['Budget Planning', 'Business', 'Savings', 'Project Management', 'Education'].includes(cat);
                } else {
                  return ['Budget Planning', 'Business', 'Savings', 'Project Management', 'Education'].includes(cat);
                }
              })].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? (selectedTemplateType === 'notes' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white')
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Templates Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600">
                Try adjusting your search or selecting a different category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => useTemplate(template.id)}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer overflow-hidden ${
                    template.type === 'money'
                      ? 'hover:border-green-300'
                      : 'hover:border-blue-300'
                  }`}
                >
                  <div className="p-6">
                    {/* Template Icon and Category */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-3xl">{template.icon}</div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {template.category}
                      </span>
                    </div>

                    {/* Template Title and Description */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {template.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    {/* Template Tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded">
                          +{template.tags.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Use Template Button */}
                    <button className={`w-full py-2 px-4 rounded-lg transition-colors text-sm font-medium text-white ${
                      template.type === 'money'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}>
                      {template.type === 'money' ? 'Create Money Tracker' : 'Use Template'}
                    </button>
                  </div>

                  {/* Preview Content */}
                  <div className="px-6 pb-6">
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono leading-relaxed max-h-24 overflow-hidden">
                      {template.content.substring(0, 120)}...
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center space-x-8 bg-white rounded-xl shadow-sm px-8 py-4">
            <div>
              <div className={`text-2xl font-bold ${selectedTemplateType === 'notes' ? 'text-blue-600' : 'text-green-600'}`}>
                {templatesByType.length}
              </div>
              <div className="text-sm text-gray-600">
                {selectedTemplateType === 'notes' ? 'Notes Templates' : 'Money Templates'}
              </div>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div>
              <div className={`text-2xl font-bold ${selectedTemplateType === 'notes' ? 'text-blue-600' : 'text-green-600'}`}>
                {TEMPLATE_CATEGORIES.filter(cat => {
                  if (selectedTemplateType === 'notes') {
                    return !['Budget Planning', 'Business', 'Savings', 'Project Management', 'Education'].includes(cat);
                  } else {
                    return ['Budget Planning', 'Business', 'Savings', 'Project Management', 'Education'].includes(cat);
                  }
                }).length}
              </div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div>
              <div className={`text-2xl font-bold ${selectedTemplateType === 'notes' ? 'text-blue-600' : 'text-green-600'}`}>
                {filteredTemplates.length}
              </div>
              <div className="text-sm text-gray-600">Showing</div>
            </div>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`mt-12 text-center rounded-xl p-8 text-white ${
            selectedTemplateType === 'notes'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
              : 'bg-gradient-to-r from-green-500 to-emerald-600'
          }`}
        >
          <h3 className="text-2xl font-bold mb-2">Can't find what you need?</h3>
          <p className={`mb-6 ${selectedTemplateType === 'notes' ? 'text-blue-100' : 'text-green-100'}`}>
            {selectedTemplateType === 'notes'
              ? 'Start with a blank note and create your own custom template.'
              : 'Start with a blank money tracker and customize it for your needs.'
            }
          </p>
          <button
            onClick={() => {
              if (selectedTemplateType === 'notes') {
                const noteId = `note_${Date.now()}`;
                router.push(`/dashboard/notes/${noteId}`);
              } else {
                const trackerId = `money_${Date.now()}`;
                router.push(`/dashboard/money/${trackerId}`);
              }
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedTemplateType === 'notes'
                ? 'bg-white text-blue-600 hover:bg-gray-100'
                : 'bg-white text-green-600 hover:bg-gray-100'
            }`}
          >
            {selectedTemplateType === 'notes' ? 'Create Blank Note' : 'Create Blank Tracker'}
          </button>
        </motion.div>
      </main>
    </div>
  );
}