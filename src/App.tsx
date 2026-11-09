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
import { ResourceAssignmentGantt } from './components/ResourceAssignmentGantt';
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

  // State tracking whether the currently displayed project is a bundled demo/sample or user-uploaded
  const [isSampleActive, setIsSampleActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('p6_is_user_uploaded');
      if (saved === 'true') return false;
    }
    return true;
  });

  // Project revision timestamp to force full re-initialization of all views on upload
  const [projectRev, setProjectRev] = useState<number>(() => Date.now());

  // Parse initial project: load saved user XER if present, otherwise default to reference sample
  const [project, setProject] = useState<ParsedProject>(() => {
    if (typeof window !== 'undefined') {
      const savedXer = sessionStorage.getItem('p6_uploaded_xer');
      const savedName = sessionStorage.getItem('p6_uploaded_name') || 'Project.xer';
      if (savedXer) {
        try {
          return parseXerProject(savedXer, savedName);
        } catch {
          // fallback to sample if saved parsing fails
        }
      }
    }
    return parseXerProject(SAMPLE_PROJECT_MAHSR, 'MAHSR-C4.xer');
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('healthDashboard');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Dynamically compute the 54-parameter health check dashboard data for the active project
  const healthDashboardData = useMemo(() => {
    return evaluateP6ProgrammeHealth(project);
  }, [project]);

  // Load custom XER content and cleanly reset all application states
  const handleLoadXerContent = (content: string, fileName: string) => {
    try {
      const parsed = parseXerProject(content, fileName);
      setProject(parsed);
      setIsSampleActive(false);
      setProjectRev(Date.now());
      try {
        sessionStorage.setItem('p6_uploaded_xer', content);
        sessionStorage.setItem('p6_uploaded_name', fileName);
        sessionStorage.setItem('p6_is_user_uploaded', 'true');
      } catch {
        // ignore storage quota issues
      }
      setSelectedActivity(null);
      setActiveTab('healthDashboard');
    } catch (err) {
      console.error('Error parsing XER file:', err);
    }
  };

  // Load sample project and reset states
  const handleSelectSample = (sample: SampleProjectInfo) => {
    try {
      const parsed = parseXerProject(sample.xerContent, `${sample.code}.xer`);
      setProject(parsed);
      setIsSampleActive(true);
      setProjectRev(Date.now());
      try {
        sessionStorage.removeItem('p6_uploaded_xer');
        sessionStorage.removeItem('p6_uploaded_name');
        sessionStorage.setItem('p6_is_user_uploaded', 'false');
      } catch {
        // ignore
      }
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
        isSampleActive={isSampleActive}
        onOpenUpload={() => setIsUploadModalOpen(true)}
      />

      {/* Main Workspace Viewport keyed by project revision for clean refresh */}
      <main key={`proj_${project.metadata.code}_${projectRev}`} className="flex-1 p-4 lg:p-6 overflow-hidden">
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

        {activeTab === 'resourceGantt' && (
          <ResourceAssignmentGantt
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
