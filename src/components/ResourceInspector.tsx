import React, { useState, useMemo } from 'react';
import { Activity, ParsedProject, Resource, ResourceType } from '../types/xer';
import {
  Users,
  Search,
  DollarSign,
  Briefcase,
  Layers,
  ArrowRight,
  HardHat,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Wrench,
  Package,
  List,
  GitFork,
  CheckCircle2,
  Clock,
  Circle,
  FileSpreadsheet,
} from 'lucide-react';

interface ResourceInspectorProps {
  project: ParsedProject;
  onSelectActivity: (activity: Activity) => void;
}

export interface ResourceTreeNode {
  id: string;
  code: string;
  name: string;
  type: ResourceType | 'GROUP';
  unit?: string;
  isGroup: boolean;
  resource?: Resource;
  children: ResourceTreeNode[];
  level: number;
  totalCost: number;
  totalAssignedUnits: number;
  assignedActivitiesCount: number;
  distinctResourcesCount: number;
}

export const ResourceInspector: React.FC<ResourceInspectorProps> = ({
  project,
  onSelectActivity,
}) => {
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Group discipline categories based on resource code or name
  const getDiscipline = (code: string, name: string, type: ResourceType): string => {
    const text = `${code} ${name}`.toUpperCase();
    if (type === 'RT_Labor') {
      if (text.includes('PM') || text.includes('MGR') || text.includes('MANAGE') || text.includes('DIRECT') || text.includes('PLAN')) {
        return 'Management & Planning';
      }
      if (text.includes('CIV') || text.includes('STR') || text.includes('ENG') || text.includes('DES') || text.includes('ARCH')) {
        return 'Engineering & Design';
      }
      if (text.includes('SURV') || text.includes('QC') || text.includes('QA') || text.includes('INSPECT') || text.includes('SAFETY')) {
        return 'Quality, Survey & HSE';
      }
      if (text.includes('ELEC') || text.includes('MECH') || text.includes('PLUMB') || text.includes('HVAC')) {
        return 'MEP & Systems';
      }
      return 'Construction & Site Operations';
    } else if (type === 'RT_Nonlabor') {
      if (text.includes('CRANE') || text.includes('RIG') || text.includes('LIFT') || text.includes('LAUNCH')) {
        return 'Heavy Lifting & Cranes';
      }
      if (text.includes('EXCAV') || text.includes('DOZER') || text.includes('LOADER') || text.includes('GRADER')) {
        return 'Earthmoving Equipment';
      }
      if (text.includes('TRUCK') || text.includes('DUMP') || text.includes('TRANS') || text.includes('TRAILER')) {
        return 'Haulage & Transport';
      }
      return 'Plant & Machinery';
    } else {
      if (text.includes('CONC') || text.includes('CEM') || text.includes('AGG') || text.includes('SAND')) {
        return 'Concrete & Aggregates';
      }
      if (text.includes('STEEL') || text.includes('REBAR') || text.includes('STR')) {
        return 'Steel & Reinforcement';
      }
      return 'General Materials';
    }
  };

  // Build the hierarchical Resource Breakdown Structure (RBS)
  const resourceTree = useMemo(() => {
    const hasExplicitParents = project.resources.some(
      (r) => r.parentId && project.resources.some((p) => p.id === r.parentId)
    );

    // If explicit parentId hierarchy exists in the XER
    if (hasExplicitParents) {
      const nodeMap = new Map<string, ResourceTreeNode>();

      for (const r of project.resources) {
        nodeMap.set(r.id, {
          id: r.id,
          code: r.code,
          name: r.name,
          type: r.type,
          unit: r.unit,
          isGroup: false,
          resource: r,
          children: [],
          level: 0,
          totalCost: r.totalCost,
          totalAssignedUnits: r.totalAssignedUnits,
          assignedActivitiesCount: r.assignedActivitiesCount,
          distinctResourcesCount: 1,
        });
      }

      const rootNodes: ResourceTreeNode[] = [];

      for (const r of project.resources) {
        const node = nodeMap.get(r.id)!;
        if (r.parentId && nodeMap.has(r.parentId)) {
          const parent = nodeMap.get(r.parentId)!;
          parent.isGroup = true;
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }

      const calculateRollups = (node: ResourceTreeNode, lvl: number): void => {
        node.level = lvl;
        for (const child of node.children) {
          calculateRollups(child, lvl + 1);
          node.totalCost += child.totalCost;
          node.totalAssignedUnits += child.totalAssignedUnits;
          node.assignedActivitiesCount += child.assignedActivitiesCount;
          node.distinctResourcesCount += child.distinctResourcesCount;
        }
      };

      rootNodes.forEach((rn) => calculateRollups(rn, 0));
      return rootNodes;
    }

    // Standard Primavera P6 RBS structure (Type -> Discipline / Category -> Resource)
    const typeRoots: Record<ResourceType, ResourceTreeNode> = {
      RT_Labor: {
        id: 'rbs_root_labor',
        code: 'LABOR',
        name: 'Labor Resources',
        type: 'RT_Labor',
        unit: 'hrs',
        isGroup: true,
        children: [],
        level: 0,
        totalCost: 0,
        totalAssignedUnits: 0,
        assignedActivitiesCount: 0,
        distinctResourcesCount: 0,
      },
      RT_Nonlabor: {
        id: 'rbs_root_nonlabor',
        code: 'EQUIP',
        name: 'Non-Labor & Equipment',
        type: 'RT_Nonlabor',
        unit: 'hrs',
        isGroup: true,
        children: [],
        level: 0,
        totalCost: 0,
        totalAssignedUnits: 0,
        assignedActivitiesCount: 0,
        distinctResourcesCount: 0,
      },
      RT_Mat: {
        id: 'rbs_root_mat',
        code: 'MAT',
        name: 'Material Resources',
        type: 'RT_Mat',
        unit: 'units',
        isGroup: true,
        children: [],
        level: 0,
        totalCost: 0,
        totalAssignedUnits: 0,
        assignedActivitiesCount: 0,
        distinctResourcesCount: 0,
      },
    };

    // Sub-disciplines map
    const disciplineMap = new Map<string, ResourceTreeNode>();

    for (const r of project.resources) {
      const typeRoot = typeRoots[r.type] || typeRoots.RT_Labor;
      const discName = getDiscipline(r.code, r.name, r.type);
      const discKey = `${r.type}_${discName}`;

      if (!disciplineMap.has(discKey)) {
        const discNode: ResourceTreeNode = {
          id: `disc_${discKey.replace(/\s+/g, '_')}`,
          code: discName.split(' ')[0].toUpperCase(),
          name: discName,
          type: r.type,
          unit: r.unit,
          isGroup: true,
          children: [],
          level: 1,
          totalCost: 0,
          totalAssignedUnits: 0,
          assignedActivitiesCount: 0,
          distinctResourcesCount: 0,
        };
        disciplineMap.set(discKey, discNode);
        typeRoot.children.push(discNode);
      }

      const parentDisc = disciplineMap.get(discKey)!;

      const leafNode: ResourceTreeNode = {
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        unit: r.unit,
        isGroup: false,
        resource: r,
        children: [],
        level: 2,
        totalCost: r.totalCost,
        totalAssignedUnits: r.totalAssignedUnits,
        assignedActivitiesCount: r.assignedActivitiesCount,
        distinctResourcesCount: 1,
      };

      parentDisc.children.push(leafNode);
      parentDisc.totalCost += r.totalCost;
      parentDisc.totalAssignedUnits += r.totalAssignedUnits;
      parentDisc.assignedActivitiesCount += r.assignedActivitiesCount;
      parentDisc.distinctResourcesCount += 1;

      typeRoot.totalCost += r.totalCost;
      typeRoot.totalAssignedUnits += r.totalAssignedUnits;
      typeRoot.assignedActivitiesCount += r.assignedActivitiesCount;
      typeRoot.distinctResourcesCount += 1;
    }

    return Object.values(typeRoots).filter((r) => r.children.length > 0);
  }, [project.resources]);

  // Expand state initialized to top level nodes
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    resourceTree.forEach((root) => {
      initial.add(root.id);
      root.children.forEach((c) => initial.add(c.id));
    });
    return initial;
  });

  // Fast map to find any node in the tree by ID
  const allNodesMap = useMemo(() => {
    const map = new Map<string, ResourceTreeNode>();
    const traverse = (node: ResourceTreeNode) => {
      map.set(node.id, node);
      node.children.forEach(traverse);
    };
    resourceTree.forEach(traverse);
    return map;
  }, [resourceTree]);

  // Set default selection if none chosen
  const activeNodeId = selectedNodeId || (resourceTree.length > 0 ? resourceTree[0].id : null);
  const activeNode = activeNodeId ? allNodesMap.get(activeNodeId) : null;

  // Toggle node expansion
  const toggleNodeExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    const all = new Set<string>();
    allNodesMap.forEach((_, id) => all.add(id));
    setExpandedNodeIds(all);
  };

  const handleCollapseAll = () => {
    setExpandedNodeIds(new Set());
  };

  // Helper to gather all leaf resource IDs under a selected tree node
  const getSubtreeResourceIds = (node: ResourceTreeNode): string[] => {
    const ids: string[] = [];
    if (!node.isGroup && node.resource) {
      ids.push(node.resource.id);
    }
    for (const child of node.children) {
      ids.push(...getSubtreeResourceIds(child));
    }
    return ids;
  };

  // Assigned activities for the currently selected tree node or flat resource
  const activeActivities = useMemo(() => {
    if (!activeNode) return [];
    const targetResourceIds = new Set(getSubtreeResourceIds(activeNode));

    const result: { activity: Activity; assignmentTargetUnits: number; assignmentCost: number }[] = [];
    const seenActs = new Set<string>();

    for (const act of project.activities) {
      const matchedAsgns = act.assignments.filter((a) => targetResourceIds.has(a.resourceId));
      if (matchedAsgns.length > 0 && !seenActs.has(act.id)) {
        seenActs.add(act.id);
        const totalUnits = matchedAsgns.reduce((s, a) => s + (a.targetUnits || 0), 0);
        const totalCost = matchedAsgns.reduce((s, a) => s + (a.targetCost || 0), 0);
        result.push({
          activity: act,
          assignmentTargetUnits: totalUnits,
          assignmentCost: totalCost,
        });
      }
    }

    return result;
  }, [activeNode, project.activities]);

  // Filtered resources for flat view
  const filteredFlatResources = useMemo(() => {
    if (!searchQuery.trim()) return project.resources;
    const q = searchQuery.toLowerCase();
    return project.resources.filter(
      (r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    );
  }, [project.resources, searchQuery]);

  // Overall totals
  const totalBudgetCost = project.resources.reduce((sum, r) => sum + r.totalCost, 0);
  const totalLaborHours = project.resources
    .filter((r) => r.type === 'RT_Labor')
    .reduce((sum, r) => sum + r.totalAssignedUnits, 0);

  // Render a recursive tree item
  const renderTreeNode = (node: ResourceTreeNode) => {
    const isExpanded = expandedNodeIds.has(node.id);
    const isSelected = activeNodeId === node.id;
    const hasChildren = node.children.length > 0;

    // Filter check for search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSelf = node.code.toLowerCase().includes(q) || node.name.toLowerCase().includes(q);
      const subtreeIds = getSubtreeResourceIds(node);
      const matchesChild = subtreeIds.some((id) => {
        const r = project.resources.find((res) => res.id === id);
        return r && (r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
      });
      if (!matchesSelf && !matchesChild) return null;
    }

    const getNodeIcon = () => {
      if (node.isGroup) {
        return isExpanded ? (
          <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
        );
      }
      switch (node.type) {
        case 'RT_Labor':
          return <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
        case 'RT_Nonlabor':
          return <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
        case 'RT_Mat':
          return <Package className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
        default:
          return <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
      }
    };

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => setSelectedNodeId(node.id)}
          style={{ paddingLeft: `${node.level * 16 + 10}px` }}
          className={`flex items-center justify-between py-2 pr-3 cursor-pointer transition-colors text-xs border-l-2 ${
            isSelected
              ? 'bg-amber-100 border-amber-500 text-amber-950 dark:bg-amber-500/15 dark:border-amber-400 dark:text-amber-200'
              : 'border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/50 dark:hover:text-slate-100'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {hasChildren ? (
              <button
                onClick={(e) => toggleNodeExpand(node.id, e)}
                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            ) : (
              <span className="w-4" />
            )}

            {getNodeIcon()}

            <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold">{node.code}</span>
            <span className="truncate font-sans font-medium text-slate-800 dark:text-slate-200">{node.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {node.totalCost > 0 && (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums hidden sm:inline">
                ${node.totalCost.toLocaleString()}
              </span>
            )}
            <span className="px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              {node.isGroup ? `${node.distinctResourcesCount} rsrc` : `${node.assignedActivitiesCount} acts`}
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>{node.children.map((child) => renderTreeNode(child))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg transition-colors">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <HardHat className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <h2 className="font-bold text-slate-900 dark:text-slate-100">Project Resources &amp; Cost Allocation</h2>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-slate-500 dark:text-slate-400 font-mono">
            {project.resources.length} Resources in RBS Tree
          </span>
        </div>

        {/* View Mode Segmented Switch + Summary Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                viewMode === 'tree'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GitFork className="w-3 h-3 text-amber-500" />
              Hierarchy Tree
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                viewMode === 'flat'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3 h-3 text-slate-500" />
              Flat List
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Total Labor:</span>
              <span className="text-slate-800 dark:text-slate-100 font-bold tabular-nums">
                {totalLaborHours.toLocaleString()} hrs
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Total Budget:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                ${totalBudgetCost.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Body: Left Tree/List Panel + Right Detailed Allocation View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Resource Hierarchy Tree or Flat List */}
        <div className="w-[390px] lg:w-[460px] shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950">
          {/* Search and Action Toolbar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Resource Code or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>

            {viewMode === 'tree' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleExpandAll}
                  className="px-2 py-1 text-xs font-medium rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Expand
                </button>
                <button
                  onClick={handleCollapseAll}
                  className="px-2 py-1 text-xs font-medium rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Collapse
                </button>
              </div>
            )}
          </div>

          {/* Tree View Mode */}
          {viewMode === 'tree' ? (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40 select-none">
              {resourceTree.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-sans">
                  No resources defined in this schedule.
                </div>
              ) : (
                resourceTree.map(renderTreeNode)
              )}
            </div>
          ) : (
            /* Flat List Mode */
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40 select-none">
              {filteredFlatResources.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-sans">
                  No resources match your search.
                </div>
              ) : (
                filteredFlatResources.map((res) => {
                  const isSelected = activeNodeId === res.id;
                  return (
                    <div
                      key={res.id}
                      onClick={() => setSelectedNodeId(res.id)}
                      className={`p-3 cursor-pointer transition-colors text-xs flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-100 border-l-2 border-amber-500 text-amber-950 dark:bg-amber-500/15 dark:border-amber-400 dark:text-amber-200'
                          : 'border-l-2 border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="space-y-0.5 truncate max-w-[240px]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                            {res.code}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {res.type === 'RT_Labor'
                              ? 'Labor'
                              : res.type === 'RT_Mat'
                              ? 'Material'
                              : 'Equipment'}
                          </span>
                        </div>
                        <p className="text-slate-900 dark:text-slate-100 font-medium truncate">{res.name}</p>
                      </div>

                      <div className="text-right font-mono text-[11px] shrink-0">
                        <span className="text-slate-800 dark:text-slate-200 block font-semibold tabular-nums">
                          {res.totalAssignedUnits.toLocaleString()} {res.unit}
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
                          ${res.totalCost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Side: Selected Node / Resource Overview & Assigned Activities Table */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 p-6 space-y-6">
          {activeNode ? (
            <>
              {/* Executive Summary Card for Selected Hierarchy Node */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold">
                        {activeNode.code}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {activeNode.isGroup ? (
                          <span className="font-medium text-amber-700 dark:text-amber-400">
                            RBS Hierarchy Group (Level {activeNode.level})
                          </span>
                        ) : activeNode.type === 'RT_Labor' ? (
                          'Labor Resource'
                        ) : activeNode.type === 'RT_Mat' ? (
                          'Material Resource'
                        ) : (
                          'Non-Labor / Equipment'
                        )}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {activeNode.name}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                      Total Rollup Budget Cost
                    </span>
                    <span className="text-2xl font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      ${activeNode.totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <div className="p-3 bg-white dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">
                      Assigned Activities
                    </span>
                    <span className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {activeActivities.length}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">
                      Planned Units
                    </span>
                    <span className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {activeNode.totalAssignedUnits.toLocaleString()} {activeNode.unit || 'units'}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">
                      {activeNode.isGroup ? 'Child Resources' : 'Resource Type'}
                    </span>
                    <span className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {activeNode.isGroup
                        ? `${activeNode.distinctResourcesCount} resources`
                        : activeNode.type === 'RT_Labor'
                        ? 'Labor'
                        : activeNode.type === 'RT_Mat'
                        ? 'Material'
                        : 'Equipment'}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">
                      Unit of Measure
                    </span>
                    <span className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 uppercase">
                      {activeNode.unit || 'HR'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Activities Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-400">
                    Assigned Activities under {activeNode.code} ({activeActivities.length})
                  </h4>
                  <span className="text-xs text-slate-500">Click any row to open activity details</span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40">
                  {activeActivities.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs font-sans">
                      No activities are currently assigned under this resource branch.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Activity ID</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">WBS Node</th>
                          <th className="py-2.5 px-3 text-right">Target Units</th>
                          <th className="py-2.5 px-3 text-right">Target Cost</th>
                          <th className="py-2.5 px-3">Start Date</th>
                          <th className="py-2.5 px-3">Finish Date</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                        {activeActivities.map(({ activity: act, assignmentTargetUnits, assignmentCost }) => (
                          <tr
                            key={act.id}
                            onClick={() => onSelectActivity(act)}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-3 text-amber-700 dark:text-amber-400 font-semibold whitespace-nowrap">
                              {act.code}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-100 font-medium">
                              {act.name}
                            </td>
                            <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                              {act.status === 'TK_Complete' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                  <CheckCircle2 className="w-3 h-3" /> Complete
                                </span>
                              ) : act.status === 'TK_Active' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-sky-400 font-semibold">
                                  <Clock className="w-3 h-3" /> In Progress
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                  <Circle className="w-3 h-3" /> Not Started
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400 truncate max-w-[140px] text-[11px]">
                              {act.wbsName}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-200 tabular-nums">
                              {assignmentTargetUnits.toLocaleString()} {activeNode.unit || 'units'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 tabular-nums font-bold">
                              ${assignmentCost.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                              {act.startDate || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                              {act.finishDate || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-blue-600 dark:text-sky-400 font-medium hover:underline">
                              Inspect &rarr;
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500">
              Select a resource or hierarchy group on the left to view assigned tasks and cost breakdown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
