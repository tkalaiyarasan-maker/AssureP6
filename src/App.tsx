/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ParsedProject, Activity } from './types/xer';
import { parseXerProject, exportProjectToXer } from './utils/xerParser';
import { SampleProjectInfo } from './data/sampleXerData';
import { evaluateP6ProgrammeHealth } from './utils/healthCheckEvaluator';
import { Navbar, ActiveTab } from './components/Navbar';
import { ProjectSummaryHeader } from './components/ProjectSummaryHeader';
import { P6HealthCheckDashboard } from './components/dashboard/P6HealthCheckDashboard';
import { GanttChart } from './components/GanttChart';
import { TilosTimeChainageChart } from './components/TilosTimeChainageChart';
import { ResourceAssignmentGantt } from './components/ResourceAssignmentGantt';
import { ActivitySheet } from './components/ActivitySheet';
import { WbsHierarchy } from './components/WbsHierarchy';
import { DcmaHealthAudit } from './components/DcmaHealthAudit';
import { ResourceInspector } from './components/ResourceInspector';
import { RawXerExplorer } from './components/RawXerExplorer';
import { ActivityDetailModal } from './components/ActivityDetailModal';
import { UploadModal } from './components/UploadModal';
import { EmptyStateUpload } from './components/EmptyStateUpload';

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

  // Project revision timestamp to force full re-initialization of all views on upload
  const [projectRev, setProjectRev] = useState<number>(() => Date.now());

  // Parse initial project: load saved user XER if present; otherwise default to null (no forced demo sample)
  const [project, setProject] = useState<ParsedProject | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedXer = sessionStorage.getItem('p6_uploaded_xer');
        const savedName = (sessionStorage.getItem('p6_uploaded_name') || '').toUpperCase();

        // Thoroughly purge any previously cached MAHSR sample from browser storage
        const isMahsrOrC4 =
          savedName.includes('MAHSR') ||
          savedName.includes('C4') ||
          (savedXer && (
            savedXer.toUpperCase().includes('MAHSR') ||
            savedXer.toUpperCase().includes('C4 - CWP') ||
            savedXer.toUpperCase().includes('PACKAGE C4') ||
            savedXer.toUpperCase().includes('HIGH-SPEED RAIL')
          ));

        if (isMahsrOrC4) {
          sessionStorage.removeItem('p6_uploaded_xer');
          sessionStorage.removeItem('p6_uploaded_name');
          sessionStorage.removeItem('p6_is_user_uploaded');
          localStorage.removeItem('p6_uploaded_xer');
          localStorage.removeItem('p6_uploaded_name');
          return null;
        }

        if (savedXer) {
          return parseXerProject(savedXer, sessionStorage.getItem('p6_uploaded_name') || 'Project.xer');
        }
      } catch {
        // ignore parsing error on stale session data
      }
    }
    return null;
  });

  // Additional mount-time sweep to guarantee no legacy MAHSR / C4 strings persist
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const sName = (sessionStorage.getItem('p6_uploaded_name') || '').toUpperCase();
        const sXer = (sessionStorage.getItem('p6_uploaded_xer') || '').toUpperCase();
        const lName = (localStorage.getItem('p6_uploaded_name') || '').toUpperCase();
        const lXer = (localStorage.getItem('p6_uploaded_xer') || '').toUpperCase();

        if (
          sName.includes('MAHSR') || sName.includes('C4') ||
          sXer.includes('MAHSR') || sXer.includes('C4 - CWP') ||
          lName.includes('MAHSR') || lName.includes('C4') ||
          lXer.includes('MAHSR')
        ) {
          sessionStorage.removeItem('p6_uploaded_xer');
          sessionStorage.removeItem('p6_uploaded_name');
          sessionStorage.removeItem('p6_is_user_uploaded');
          localStorage.removeItem('p6_uploaded_xer');
          localStorage.removeItem('p6_uploaded_name');
          setProject(null);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const handleResetProject = () => {
    setProject(null);
    setSelectedActivity(null);
    try {
      sessionStorage.removeItem('p6_uploaded_xer');
      sessionStorage.removeItem('p6_uploaded_name');
      sessionStorage.removeItem('p6_is_user_uploaded');
      localStorage.removeItem('p6_uploaded_xer');
      localStorage.removeItem('p6_uploaded_name');
    } catch {
      // ignore storage errors
    }
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('healthDashboard');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Dynamically compute the 54-parameter health check dashboard data for the active project
  const healthDashboardData = useMemo(() => {
    if (!project) return null;
    return evaluateP6ProgrammeHealth(project);
  }, [project]);

  // Load custom XER content and cleanly reset all application states
  const handleLoadXerContent = (content: string, fileName: string) => {
    try {
      const parsed = parseXerProject(content, fileName);
      setProject(parsed);
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

  // Optional sample load
  const handleSelectSample = (sample: SampleProjectInfo) => {
    try {
      const parsed = parseXerProject(sample.xerContent, `${sample.code}.xer`);
      setProject(parsed);
      setProjectRev(Date.now());
      try {
        sessionStorage.setItem('p6_uploaded_xer', sample.xerContent);
        sessionStorage.setItem('p6_uploaded_name', `${sample.code}.xer`);
        sessionStorage.setItem('p6_is_user_uploaded', 'true');
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
    if (!project) return;
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
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onSelectSample={handleSelectSample}
        onDownloadXer={handleDownloadXer}
        activeProjectCode={project ? project.metadata.code : 'No File Loaded'}
        theme={theme}
        onToggleTheme={toggleTheme}
        onResetProject={handleResetProject}
        isProjectLoaded={!!project}
      />

      {/* Project Identity & KPI Summary Bar (visible once project is loaded) */}
      {project && (
        <ProjectSummaryHeader
          project={project}
          onNavigateToTab={setActiveTab}
          onOpenUpload={() => setIsUploadModalOpen(true)}
        />
      )}

      {/* Main Workspace Viewport */}
      {!project ? (
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <EmptyStateUpload
            onLoadXerContent={handleLoadXerContent}
            onSelectSample={handleSelectSample}
          />
        </main>
      ) : (
        <main key={`proj_${project.metadata.code}_${projectRev}`} className="flex-1 p-4 lg:p-6 overflow-hidden">
          {activeTab === 'healthDashboard' && healthDashboardData && (
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

          {activeTab === 'tilos' && (
            <TilosTimeChainageChart
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
      )}

      {/* Activity Detail Inspector Modal */}
      {project && (
        <ActivityDetailModal
          activity={selectedActivity}
          project={project}
          onClose={() => setSelectedActivity(null)}
          onSelectActivity={setSelectedActivity}
        />
      )}

      {/* XER Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onLoadXerContent={handleLoadXerContent}
        onSelectSample={handleSelectSample}
      />
    </div>
  );
}
