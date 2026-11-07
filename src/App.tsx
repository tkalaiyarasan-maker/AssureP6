/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ParsedProject, Activity } from './types/xer';
import { parseXerProject, exportProjectToXer } from './utils/xerParser';
import { SAMPLE_PROJECTS, SAMPLE_PROJECT_MAHSR, SampleProjectInfo } from './data/sampleXerData';
import { evaluateP6ProgrammeHealth } from './utils/healthCheckEvaluator';
import { Navbar, ActiveTab } from './components/Navbar';
import { ProjectSummaryHeader } from './components/ProjectSummaryHeader';
import { P6HealthCheckDashboard } from './components/dashboard/P6HealthCheckDashboard';
import { GanttChart } from './components/GanttChart';
import { ActivitySheet } from './components/ActivitySheet';
import { WbsHierarchy } from './components/WbsHierarchy';
import { DcmaHealthAudit } from './components/DcmaHealthAudit';
import { ResourceInspector } from './components/ResourceInspector';
import { RawXerExplorer } from './components/RawXerExplorer';
import { ActivityDetailModal } from './components/ActivityDetailModal';
import { UploadModal } from './components/UploadModal';

export default function App() {
  // Theme state: defaults to 'light' as requested by the user
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('p6_app_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  // Apply dark class to documentElement whenever theme is dark
  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('p6_app_theme', theme);
    } catch {
      // ignore local storage errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Parse initial default project: MAHSR C4 - CWP Baseline (the reference project from the user's framework)
  const [project, setProject] = useState<ParsedProject>(() => {
    return parseXerProject(SAMPLE_PROJECT_MAHSR, 'MAHSR-C4.xer');
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('healthDashboard');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Dynamically compute the 54-parameter L&T health check dashboard data for the active project
  const healthDashboardData = useMemo(() => {
    return evaluateP6ProgrammeHealth(project);
  }, [project]);

  // Load custom XER content
  const handleLoadXerContent = (content: string, fileName: string) => {
    try {
      const parsed = parseXerProject(content, fileName);
      setProject(parsed);
      setSelectedActivity(null);
      setActiveTab('healthDashboard');
    } catch (err) {
      console.error('Error parsing XER file:', err);
    }
  };

  // Load sample project
  const handleSelectSample = (sample: SampleProjectInfo) => {
    try {
      const parsed = parseXerProject(sample.xerContent, `${sample.code}.xer`);
      setProject(parsed);
      setSelectedActivity(null);
      setActiveTab('healthDashboard');
    } catch (err) {
      console.error('Error loading sample project:', err);
    }
  };

  // Export current project as valid .XER file
  const handleDownloadXer = () => {
    try {
      const rawText = exportProjectToXer(project);
      const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.metadata.code || 'primavera_project'}.xer`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting XER:', err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-900 dark:selection:text-amber-200 transition-colors">
      {/* Top 3-Zone Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onSelectSample={handleSelectSample}
        onDownloadXer={handleDownloadXer}
        activeProjectCode={project.metadata.code}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Project Identity & KPI Summary Bar */}
      <ProjectSummaryHeader
        project={project}
        onNavigateToTab={setActiveTab}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 p-4 lg:p-6 overflow-hidden">
        {activeTab === 'healthDashboard' && (
          <P6HealthCheckDashboard
            data={healthDashboardData}
          />
        )}

        {activeTab === 'gantt' && (
          <GanttChart
            project={project}
            onSelectActivity={setSelectedActivity}
            selectedActivityId={selectedActivity?.id}
          />
        )}

        {activeTab === 'activities' && (
          <ActivitySheet
            project={project}
            onSelectActivity={setSelectedActivity}
            selectedActivityId={selectedActivity?.id}
          />
        )}

        {activeTab === 'wbs' && (
          <WbsHierarchy
            project={project}
            onSelectActivity={setSelectedActivity}
          />
        )}

        {activeTab === 'dcma' && (
          <DcmaHealthAudit
            project={project}
            onSelectActivity={setSelectedActivity}
          />
        )}

        {activeTab === 'resources' && (
          <ResourceInspector
            project={project}
            onSelectActivity={setSelectedActivity}
          />
        )}

        {activeTab === 'raw' && (
          <RawXerExplorer
            project={project}
          />
        )}
      </main>

      {/* Activity Detail Inspector Modal */}
      <ActivityDetailModal
        activity={selectedActivity}
        project={project}
        onClose={() => setSelectedActivity(null)}
        onSelectActivity={setSelectedActivity}
      />

      {/* XER Upload / Sample Picker Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onLoadXerContent={handleLoadXerContent}
        onSelectSample={handleSelectSample}
      />
    </div>
  );
}
