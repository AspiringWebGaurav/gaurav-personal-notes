'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/templates';
import { ChevronLeft, LayoutTemplate, Search, FileText, Wallet, Loader2 } from 'lucide-react';

export default function TemplatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTemplateType, setSelectedTemplateType] = useState<'notes' | 'money'>('notes');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500" />
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

  const handleUseTemplate = (templateId: string) => {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={goBack}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500 dark:text-slate-400"
                title="Go back to dashboard"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Templates</h1>
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
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2 tracking-tight">
            Choose a Template
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Get started quickly with our collection of professionally designed templates
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
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center">
              <button
                onClick={() => {
                  setSelectedTemplateType('notes');
                  setSelectedCategory('All');
                }}
                className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${selectedTemplateType === 'notes'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
              >
                <FileText className="h-4 w-4" />
                Notes Templates
              </button>
              <button
                onClick={() => {
                  setSelectedTemplateType('money');
                  setSelectedCategory('All');
                }}
                className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${selectedTemplateType === 'money'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
              >
                <Wallet className="h-4 w-4" />
                Money Templates
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
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-700 placeholder:text-slate-400"
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
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${selectedCategory === category
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-900'
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
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 text-slate-400 mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">No templates found</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Try adjusting your search or selecting a different category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleUseTemplate(template.id)}
                  className="group bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all cursor-pointer flex flex-col"
                >
                  <div className="p-5 flex-1">
                    {/* Template Icon and Category */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-3xl">{template.icon}</div>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium rounded-md uppercase tracking-wider">
                        {template.category}
                      </span>
                    </div>

                    {/* Template Title and Description */}
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      {template.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    {/* Template Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {template.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] rounded">
                          +{template.tags.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Use Template Button */}
                    <button className="w-full py-1.5 rounded-md transition-colors text-xs font-medium bg-slate-900 text-slate-50 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
                      {template.type === 'money' ? 'Create Tracker' : 'Use Template'}
                    </button>
                  </div>

                  {/* Preview Content */}
                  <div className="px-5 pb-5 mt-auto">
                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-md p-3 text-[10px] text-slate-400 dark:text-slate-500 font-mono leading-relaxed max-h-20 overflow-hidden">
                      {template.content.substring(0, 100)}...
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
          <div className="inline-flex items-center space-x-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm px-8 py-3">
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {templatesByType.length}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Templates
              </div>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {TEMPLATE_CATEGORIES.filter(cat => {
                  if (selectedTemplateType === 'notes') {
                    return !['Budget Planning', 'Business', 'Savings', 'Project Management', 'Education'].includes(cat);
                  } else {
                    return ['Budget Planning', 'Business', 'Savings', 'Project Management', 'Education'].includes(cat);
                  }
                }).length}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Categories</div>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {filteredTemplates.length}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Showing</div>
            </div>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center rounded-xl p-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Can&apos;t find what you need?</h3>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
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
            className="px-6 py-2 rounded-md font-medium transition-colors text-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {selectedTemplateType === 'notes' ? 'Create Blank Note' : 'Create Blank Tracker'}
          </button>
        </motion.div>
      </main>
    </div>
  );
}