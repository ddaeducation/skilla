import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Calendar,
  CalendarDays,
  FileText,
  Video,
  Youtube,
  Image as ImageIcon,
  ClipboardList,
  HelpCircle,
  CheckCircle,
  ChevronsUpDown,
  PanelLeftClose,
  Lock,
} from "lucide-react";

interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  parent_id: string | null;
  section_level: number | null;
}

interface LessonContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  order_index: number;
  duration_minutes: number | null;
  is_free_preview: boolean;
  section_id: string | null;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  order_index: number;
  section_id: string | null;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  max_score: number;
  due_date: string | null;
  order_index: number;
  section_id: string | null;
}

type ContentItem =
  | { type: "lesson"; data: LessonContent; order_index: number }
  | { type: "quiz"; data: Quiz; order_index: number }
  | { type: "assignment"; data: Assignment; order_index: number };

interface CourseContentSidebarProps {
  sections: CourseSection[];
  unifiedContent: ContentItem[];
  activeContent: ContentItem | null;
  onSelectContent: (item: ContentItem) => void;
  getItemStatus: (item: ContentItem) => boolean;
  isItemLocked?: (item: ContentItem) => boolean;
  completedItems: number;
  totalItems: number;
  onHideSidebar?: () => void;
}

// Helper to get content icon
const getContentIcon = (type: string) => {
  switch (type) {
    case "video":
      return <Video className="w-4 h-4" />;
    case "youtube":
      return <Youtube className="w-4 h-4" />;
    case "pdf":
      return <FileText className="w-4 h-4" />;
    case "image":
      return <ImageIcon className="w-4 h-4" />;
    case "python":
      return <span className="w-4 h-4 text-xs flex items-center justify-center">🐍</span>;
    case "sql":
      return <span className="w-4 h-4 text-xs flex items-center justify-center">🗄️</span>;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

// Helper to get section icon based on level
const getSectionIcon = (level: number | null) => {
  switch (level) {
    case 1:
      return <Calendar className="w-4 h-4 text-primary flex-shrink-0" />; // Module
    case 2:
      return <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" />; // Unit
    default:
      return <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />;
  }
};

export function CourseContentSidebar({
  sections,
  unifiedContent,
  activeContent,
  onSelectContent,
  getItemStatus,
  isItemLocked,
  completedItems,
  totalItems,
  onHideSidebar,
}: CourseContentSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(sections.map((s) => s.id))
  );

  // Build hierarchical section structure - only level 1 (Module) and level 2 (Unit)
  const sectionHierarchy = useMemo(() => {
    const sectionMap = new Map<string, CourseSection>();
    const rootSections: CourseSection[] = [];
    const childrenMap = new Map<string, CourseSection[]>();

    // Filter to only include Module (level 1) and Unit (level 2) sections
    const relevantSections = sections.filter(s => (s.section_level || 1) <= 2);

    relevantSections.forEach((section) => {
      sectionMap.set(section.id, section);
      if (!section.parent_id || (section.section_level || 1) === 1) {
        // Level 1 sections are roots
        if ((section.section_level || 1) === 1) {
          rootSections.push(section);
        }
      } else {
        // Level 2 sections are children of level 1
        const children = childrenMap.get(section.parent_id) || [];
        children.push(section);
        childrenMap.set(section.parent_id, children);
      }
    });

    // Sort by order_index
    rootSections.sort((a, b) => a.order_index - b.order_index);
    childrenMap.forEach((children) => {
      children.sort((a, b) => a.order_index - b.order_index);
    });

    return { rootSections, childrenMap, sectionMap };
  }, [sections]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const expandAll = () => {
    setExpandedSections(new Set(sections.map((s) => s.id)));
  };

  const allExpanded = expandedSections.size === sections.length;
  const allCollapsed = expandedSections.size === 0;

  // Get content items for a specific section (not including subsections)
  const getSectionContent = (sectionId: string) => {
    return unifiedContent.filter((item) => item.data.section_id === sectionId);
  };

  // Get all descendant section IDs
  const getDescendantSectionIds = (sectionId: string): string[] => {
    const children = sectionHierarchy.childrenMap.get(sectionId) || [];
    const ids: string[] = [];
    children.forEach((child) => {
      ids.push(child.id);
      ids.push(...getDescendantSectionIds(child.id));
    });
    return ids;
  };

  // Get all content in section and its descendants
  const getSectionContentWithDescendants = (sectionId: string) => {
    const allSectionIds = [sectionId, ...getDescendantSectionIds(sectionId)];
    return unifiedContent.filter((item) => 
      item.data.section_id && allSectionIds.includes(item.data.section_id)
    );
  };

  // Calculate completion stats for a section including descendants
  const getSectionStats = (sectionId: string) => {
    const content = getSectionContentWithDescendants(sectionId);
    const completed = content.filter((item) => getItemStatus(item)).length;
    return { completed, total: content.length };
  };

  // Render content item button
  const renderContentItem = (item: ContentItem) => {
    const isCompleted = getItemStatus(item);
    const locked = isItemLocked?.(item) ?? false;
    const isActive =
      activeContent?.type === item.type && activeContent.data.id === item.data.id;

    let icon;
    let label;
    let badgeContent;

    if (item.type === "lesson") {
      icon = getContentIcon(item.data.content_type);
      label = item.data.title;
      if (item.data.duration_minutes) {
        badgeContent = `${item.data.duration_minutes}m`;
      }
    } else if (item.type === "quiz") {
      icon = <HelpCircle className="w-4 h-4" />;
      label = item.data.title;
      badgeContent = `${item.data.passing_score}%`;
    } else {
      icon = <ClipboardList className="w-4 h-4" />;
      label = item.data.title;
      badgeContent = `${item.data.max_score}pts`;
    }

    return (
      <button
        key={`${item.type}-${item.data.id}`}
        onClick={() => onSelectContent(item)}
        className={`w-full text-left p-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
          locked
            ? "opacity-50 cursor-not-allowed"
            : isActive
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted"
        }`}
      >
        {locked ? (
          <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : isCompleted ? (
          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
        ) : (
          <span className="flex-shrink-0">{icon}</span>
        )}
        <span className="break-words flex-1 min-w-0">{label}</span>
        {badgeContent && (
          <Badge
            variant="outline"
            className={`text-xs ml-auto ${
              isActive ? "bg-primary-foreground/20 border-primary-foreground/30" : ""
            }`}
          >
            {badgeContent}
          </Badge>
        )}
      </button>
    );
  };

  // Render section - simplified for 2-level structure (Module → Unit with content)
  const renderSection = (section: CourseSection, depth: number = 0) => {
    const level = section.section_level || 1;
    const isExpanded = expandedSections.has(section.id);
    const paddingLeft = depth * 12;

    // For Modules (level 1), show child Units
    if (level === 1) {
      const children = sectionHierarchy.childrenMap.get(section.id) || [];
      const stats = getSectionStats(section.id);

      return (
        <Collapsible
          key={section.id}
          open={isExpanded}
          onOpenChange={() => toggleSection(section.id)}
        >
          <CollapsibleTrigger asChild>
            <button
              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-left"
              style={{ paddingLeft: `${paddingLeft + 8}px` }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              )}
              {getSectionIcon(level)}
              <span className="font-medium text-sm break-words flex-1 min-w-0">
                {section.title}
              </span>
              <Badge variant="secondary" className="text-xs">
                {stats.completed}/{stats.total}
              </Badge>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 mt-1" style={{ paddingLeft: `${paddingLeft + 24}px` }}>
              {section.description && (
                <p className="text-xs text-muted-foreground px-2 pb-1">
                  {section.description}
                </p>
              )}
              {children.length > 0 ? (
                children.map((child) => renderSection(child, depth + 1))
              ) : (
                <p className="text-xs text-muted-foreground p-2 italic">
                  No units in this module
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // For Units (level 2), show content items directly
    const sectionContent = getSectionContent(section.id);
    const stats = getSectionStats(section.id);

    return (
      <Collapsible
        key={section.id}
        open={isExpanded}
        onOpenChange={() => toggleSection(section.id)}
      >
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-left"
            style={{ paddingLeft: `${paddingLeft + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            )}
              {getSectionIcon(level)}
            <span className="font-medium text-sm break-words flex-1 min-w-0">
              {section.title}
            </span>
            <Badge variant="secondary" className="text-xs">
              {stats.completed}/{stats.total}
            </Badge>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-1 mt-1" style={{ paddingLeft: `${paddingLeft + 24}px` }}>
            {sectionContent.length > 0 ? (
              sectionContent.map((item) => renderContentItem(item))
            ) : (
              <p className="text-xs text-muted-foreground p-2 italic">
                No content in this unit
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  // Unsectioned content
  const unsectionedContent = unifiedContent.filter((item) => !item.data.section_id);


  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Course Content</CardTitle>
          {onHideSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onHideSidebar}
              title="Hide sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {completedItems} of {totalItems} completed
        </p>
        {/* Collapse/Expand Controls */}
        <div className="flex gap-1 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
            disabled={allCollapsed}
            className="flex-1 text-xs"
          >
            <ChevronsUpDown className="h-3 w-3 mr-1" />
            Collapse All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
            disabled={allExpanded}
            className="flex-1 text-xs"
          >
            <ChevronsUpDown className="h-3 w-3 mr-1" />
            Expand All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-1">
            {sectionHierarchy.rootSections.length > 0 ? (
              <>
                {sectionHierarchy.rootSections.map((section) =>
                  renderSection(section, 0)
                )}

              </>
            ) : (
              /* No sections - show flat list */
              <>
                {unifiedContent.map((item) => renderContentItem(item))}
                {unifiedContent.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">No content yet</p>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
