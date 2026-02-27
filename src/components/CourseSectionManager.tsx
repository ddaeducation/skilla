import { useState, useMemo, useEffect } from "react";
import { Plus, GripVertical, Pencil, Trash2, ChevronDown, ChevronRight, FolderOpen, Calendar, CalendarDays, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AIContentGenerator } from "@/components/AIContentGenerator";
import { AddContentToSection } from "@/components/AddContentToSection";
import { UnitContentItems, ContentItem } from "@/components/UnitContentItems";
import { ContentItemEditDialog } from "@/components/ContentItemEditDialog";

interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  parent_id: string | null;
  section_level: number | null;
}

interface CourseSectionManagerProps {
  courseId: string;
  courseName: string;
  sections: CourseSection[];
  onSectionsChange: () => void;
  onContentGenerated?: () => void;
}

// SortableSectionProps defined below with additional props

const getSectionIcon = (level: number | null) => {
  switch (level) {
    case 1:
      return <Calendar className="h-4 w-4 text-primary" />;
    case 2:
      return <CalendarDays className="h-4 w-4 text-primary" />;
    case 3:
      return <FolderOpen className="h-4 w-4 text-primary" />;
    default:
      return <FolderOpen className="h-4 w-4 text-primary" />;
  }
};

const getLevelLabel = (level: number | null) => {
  switch (level) {
    case 1:
      return "Module";
    case 2:
      return "Unit";
    case 3:
      return "Lesson";
    default:
      return "Section";
  }
};

interface SortableSectionProps {
  section: CourseSection;
  onEdit: (section: CourseSection) => void;
  onDelete: (section: CourseSection) => void;
  onAddChild: (parentId: string, level: number) => void;
  isExpanded: boolean;
  onToggle: () => void;
  depth: number;
  children?: React.ReactNode;
  courseId: string;
  courseName: string;
  onContentGenerated?: () => void;
}

const SortableSection = ({ 
  section, 
  onEdit, 
  onDelete, 
  onAddChild,
  isExpanded, 
  onToggle, 
  depth,
  children,
  courseId,
  courseName,
  onContentGenerated,
}: SortableSectionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const paddingLeft = depth * 24;
  const level = section.section_level || 1;

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <div 
          className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border"
          style={{ marginLeft: `${paddingLeft}px` }}
        >
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          >
            <GripVertical className="h-4 w-4 opacity-50" />
          </button>
          
          <CollapsibleTrigger asChild>
            <button className="p-1 hover:bg-muted rounded">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </CollapsibleTrigger>
          
          {getSectionIcon(level)}
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{section.title}</h4>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {getLevelLabel(level)}
              </span>
            </div>
            {section.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{section.description.replace(/<[^>]*>/g, '')}</p>
            )}
          </div>

          {/* For level 1 (Module), show Add Unit button */}
          {level === 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddChild(section.id, level + 1)}
              className="h-8 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Unit
            </Button>
          )}
          
          {/* For level 2 (Unit), show AI Generate Content and Add Content */}
          {level === 2 && onContentGenerated && (
            <div className="flex gap-1">
              <AIContentGenerator
                courseId={courseId}
                courseName={courseName}
                sectionId={section.id}
                onContentGenerated={onContentGenerated}
              />
              <AddContentToSection
                courseId={courseId}
                sectionId={section.id}
                onContentCreated={onContentGenerated}
              />
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(section)}
            className="h-8 w-8"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(section)}
            className="h-8 w-8 text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        
        <CollapsibleContent>
          <div className="py-1">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export const CourseSectionManager = ({ courseId, courseName, sections, onSectionsChange, onContentGenerated }: CourseSectionManagerProps) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CourseSection | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sectionLevel, setSectionLevel] = useState<number>(1);
  const [parentId, setParentId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Content items state
  const [contentBySection, setContentBySection] = useState<Map<string, ContentItem[]>>(new Map());
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItemType, setEditingItemType] = useState<'lesson' | 'quiz' | 'assignment'>('lesson');
  const [editingItemId, setEditingItemId] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch content items for all sections
  const fetchContentItems = async () => {
    const [lessonsRes, quizzesRes, assignmentsRes] = await Promise.all([
      supabase.from("lesson_content").select("*").eq("course_id", courseId),
      supabase.from("quizzes").select("*").eq("course_id", courseId),
      supabase.from("assignments").select("*").eq("course_id", courseId),
    ]);

    const newContentMap = new Map<string, ContentItem[]>();

    // Process lessons
    (lessonsRes.data || []).forEach((lesson) => {
      if (lesson.section_id) {
        const items = newContentMap.get(lesson.section_id) || [];
        items.push({
          id: lesson.id,
          title: lesson.title,
          type: 'lesson',
          content_type: lesson.content_type,
          order_index: lesson.order_index,
          description: lesson.description,
        });
        newContentMap.set(lesson.section_id, items);
      }
    });

    // Process quizzes
    (quizzesRes.data || []).forEach((quiz) => {
      if (quiz.section_id) {
        const items = newContentMap.get(quiz.section_id) || [];
        items.push({
          id: quiz.id,
          title: quiz.title,
          type: 'quiz',
          order_index: quiz.order_index,
          description: quiz.description,
          passing_score: quiz.passing_score,
          time_limit_minutes: quiz.time_limit_minutes,
        });
        newContentMap.set(quiz.section_id, items);
      }
    });

    // Process assignments
    (assignmentsRes.data || []).forEach((assignment) => {
      if (assignment.section_id) {
        const items = newContentMap.get(assignment.section_id) || [];
        items.push({
          id: assignment.id,
          title: assignment.title,
          type: 'assignment',
          order_index: assignment.order_index,
          description: assignment.description,
          max_score: assignment.max_score,
          due_date: assignment.due_date,
        });
        newContentMap.set(assignment.section_id, items);
      }
    });

    // Sort items by order_index
    newContentMap.forEach((items) => {
      items.sort((a, b) => a.order_index - b.order_index);
    });

    setContentBySection(newContentMap);
  };

  useEffect(() => {
    fetchContentItems();
  }, [courseId]);

  // Refetch when content is generated
  useEffect(() => {
    if (onContentGenerated) {
      fetchContentItems();
    }
  }, [sections]);

  // Build hierarchical structure
  const { rootSections, childrenMap, allSectionIds } = useMemo(() => {
    const rootSections: CourseSection[] = [];
    const childrenMap = new Map<string, CourseSection[]>();
    const allSectionIds: string[] = [];

    sections.forEach((section) => {
      allSectionIds.push(section.id);
      if (!section.parent_id) {
        rootSections.push(section);
      } else {
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

    return { rootSections, childrenMap, allSectionIds };
  }, [sections]);

  const handleOpenDialog = (section?: CourseSection, newParentId?: string, newLevel?: number) => {
    if (section) {
      setEditingSection(section);
      setTitle(section.title);
      setDescription(section.description || "");
      setSectionLevel(section.section_level || 1);
      setParentId(section.parent_id);
    } else {
      setEditingSection(null);
      setTitle("");
      setDescription("");
      setSectionLevel(newLevel || 1);
      setParentId(newParentId || null);
    }
    setDialogOpen(true);
  };

  const handleAddChild = (parentSectionId: string, level: number) => {
    handleOpenDialog(undefined, parentSectionId, level);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Section title is required",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate section titles within same parent (case-insensitive)
    const normalizedTitle = title.trim().toLowerCase();
    const siblingSections = sections.filter(s => s.parent_id === parentId);
    const duplicateExists = siblingSections.some(
      (s) => 
        s.title.toLowerCase() === normalizedTitle && 
        s.id !== editingSection?.id
    );

    if (duplicateExists) {
      toast({
        title: "Duplicate Section",
        description: "A section with this title already exists at this level. Please use a different name.",
        variant: "destructive",
      });
      return;
    }

    if (editingSection) {
      const { error } = await supabase
        .from("course_sections")
        .update({ 
          title: title.trim(), 
          description: description || null,
          section_level: sectionLevel,
          parent_id: parentId,
        })
        .eq("id", editingSection.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update section",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Section updated" });
    } else {
      // Get max order_index among siblings
      const siblingSections = sections.filter(s => s.parent_id === parentId);
      const maxOrderIndex = siblingSections.length > 0 
        ? Math.max(...siblingSections.map(s => s.order_index)) + 1 
        : 0;

      const { error } = await supabase
        .from("course_sections")
        .insert({
          course_id: courseId,
          title: title.trim(),
          description: description || null,
          order_index: maxOrderIndex,
          section_level: sectionLevel,
          parent_id: parentId,
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create section",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Section created" });
    }

    setDialogOpen(false);
    onSectionsChange();
  };

  const handleDelete = async (section: CourseSection) => {
    // Check if section has children
    const children = childrenMap.get(section.id) || [];
    if (children.length > 0) {
      toast({
        title: "Cannot Delete",
        description: "Please delete all child sections first.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("course_sections")
      .delete()
      .eq("id", section.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete section",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Section deleted" });
    onSectionsChange();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeSection = sections.find(s => s.id === active.id);
      const overSection = sections.find(s => s.id === over.id);

      if (!activeSection || !overSection) return;

      // Only allow reordering within same parent
      if (activeSection.parent_id !== overSection.parent_id) {
        toast({
          title: "Cannot Move",
          description: "Sections can only be reordered within the same parent level.",
          variant: "destructive",
        });
        return;
      }

      const siblings = activeSection.parent_id 
        ? childrenMap.get(activeSection.parent_id) || []
        : rootSections;

      const oldIndex = siblings.findIndex((s) => s.id === active.id);
      const newIndex = siblings.findIndex((s) => s.id === over.id);

      const newOrder = arrayMove(siblings, oldIndex, newIndex);

      // Update order_index in database
      for (let i = 0; i < newOrder.length; i++) {
        await supabase
          .from("course_sections")
          .update({ order_index: i })
          .eq("id", newOrder[i].id);
      }

      onSectionsChange();
    }
  };

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
    setExpandedSections(new Set(allSectionIds));
  };

  // Edit content handlers
  const handleEditLesson = (id: string) => {
    setEditingItemType('lesson');
    setEditingItemId(id);
    setEditDialogOpen(true);
  };

  const handleEditQuiz = (id: string) => {
    setEditingItemType('quiz');
    setEditingItemId(id);
    setEditDialogOpen(true);
  };

  const handleEditAssignment = (id: string) => {
    setEditingItemType('assignment');
    setEditingItemId(id);
    setEditDialogOpen(true);
  };

  // Delete content handlers
  const handleDeleteLesson = async (id: string) => {
    const { error } = await supabase.from("lesson_content").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete lesson", variant: "destructive" });
      return;
    }
    toast({ title: "Lesson deleted" });
    fetchContentItems();
  };

  const handleDeleteQuiz = async (id: string) => {
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete quiz", variant: "destructive" });
      return;
    }
    toast({ title: "Quiz deleted" });
    fetchContentItems();
  };

  const handleDeleteAssignment = async (id: string) => {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete assignment", variant: "destructive" });
      return;
    }
    toast({ title: "Assignment deleted" });
    fetchContentItems();
  };

  // Handle reordering of content items within a unit
  const handleReorderContent = async (sectionId: string, items: ContentItem[]) => {
    // Update order_index for each item in the database
    const updates = items.map((item, index) => {
      const table = item.type === 'lesson' ? 'lesson_content' : 
                    item.type === 'quiz' ? 'quizzes' : 'assignments';
      return supabase
        .from(table)
        .update({ order_index: index })
        .eq('id', item.id);
    });

    try {
      await Promise.all(updates);
      toast({ title: "Content reordered" });
      fetchContentItems();
    } catch (error) {
      toast({ title: "Error", description: "Failed to reorder content", variant: "destructive" });
    }
  };

  // Recursively render sections
  const renderSection = (section: CourseSection, depth: number = 0): React.ReactNode => {
    const children = childrenMap.get(section.id) || [];
    const level = section.section_level || 1;
    const sectionContent = contentBySection.get(section.id) || [];

    return (
      <SortableSection
        key={section.id}
        section={section}
        onEdit={handleOpenDialog}
        onDelete={handleDelete}
        onAddChild={handleAddChild}
        isExpanded={expandedSections.has(section.id)}
        onToggle={() => toggleSection(section.id)}
        depth={depth}
        courseId={courseId}
        courseName={courseName}
        onContentGenerated={() => {
          fetchContentItems();
          onContentGenerated?.();
        }}
      >
        {/* For Units (level 2), show content items */}
        {level === 2 && (
          <UnitContentItems
            items={sectionContent}
            depth={depth}
            sectionId={section.id}
            onEditLesson={handleEditLesson}
            onEditQuiz={handleEditQuiz}
            onEditAssignment={handleEditAssignment}
            onDeleteLesson={handleDeleteLesson}
            onDeleteQuiz={handleDeleteQuiz}
            onDeleteAssignment={handleDeleteAssignment}
            onReorderContent={handleReorderContent}
          />
        )}
        {/* For Modules (level 1), show child Units */}
        {level === 1 && children.length > 0 && (
          children.map((child) => renderSection(child, depth + 1))
        )}
        {/* For Modules without children, show placeholder */}
        {level === 1 && children.length === 0 && (
          <p 
            className="text-sm text-muted-foreground italic py-2"
            style={{ marginLeft: `${(depth + 1) * 24}px` }}
          >
            No units added yet
          </p>
        )}
      </SortableSection>
    );
  };

  // Get available parent sections for dropdown (only level 1 and 2)
  const getAvailableParents = () => {
    return sections.filter(s => (s.section_level || 1) < 3);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Course Structure</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
            disabled={expandedSections.size === 0}
          >
            <ChevronsUpDown className="h-4 w-4 mr-1" />
            Collapse All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
            disabled={expandedSections.size === allSectionIds.length}
          >
            <ChevronsUpDown className="h-4 w-4 mr-1" />
            Expand All
          </Button>
          <Button onClick={() => handleOpenDialog()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Organize your course: Module → Unit (with content)
      </p>

      {rootSections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sections yet. Start by adding a Module to organize your course content.</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={allSectionIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {rootSections.map((section) => renderSection(section, 0))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? `Edit ${getLevelLabel(sectionLevel)}` : `Create ${getLevelLabel(sectionLevel)}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">{getLevelLabel(sectionLevel)} Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g., ${sectionLevel === 1 ? 'Module 1: Foundation' : sectionLevel === 2 ? 'Unit 1' : 'Lesson 1: Introduction'}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Brief description of this ${getLevelLabel(sectionLevel).toLowerCase()}`}
                rows={3}
              />
            </div>
            {!editingSection && sectionLevel > 1 && (
              <div className="space-y-2">
                <Label>Parent Section</Label>
                <Select value={parentId || ""} onValueChange={(v) => setParentId(v || null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent section" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableParents()
                      .filter(s => (s.section_level || 1) === sectionLevel - 1)
                      .map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingSection ? "Save Changes" : `Create ${getLevelLabel(sectionLevel)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Content Dialog */}
      <ContentItemEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        type={editingItemType}
        itemId={editingItemId}
        onSaved={() => {
          fetchContentItems();
          onContentGenerated?.();
        }}
      />
    </div>
  );
};
