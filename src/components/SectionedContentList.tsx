import { useState, useMemo } from "react";
import { FileText, Video, Youtube, Image, FileQuestion, ClipboardList, GripVertical, Pencil, Trash2, Eye, Play, ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { QuizPreview } from "@/components/QuizPreview";
import { AssignmentPreview } from "@/components/AssignmentPreview";
import { toast } from "@/hooks/use-toast";

interface Section {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  parent_id?: string | null;
  section_level?: number | null;
}

interface LessonContent {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  order_index: number;
  duration_minutes: number | null;
  is_free_preview: boolean;
  section_id?: string | null;
}

interface Quiz {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  order_index: number;
  time_limit_minutes?: number | null;
  section_id?: string | null;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  order_index: number;
  explanation: string | null;
}

interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  instructions?: string | null;
  max_score: number;
  due_date: string | null;
  order_index: number;
  section_id?: string | null;
}

type UnifiedContentItem = {
  id: string;
  uniqueId: string;
  title: string;
  description: string | null;
  order_index: number;
  type: "lesson" | "quiz" | "assignment";
  contentType?: string;
  passingScore?: number;
  maxScore?: number;
  dueDate?: string | null;
  durationMinutes?: number | null;
  isFreePreview?: boolean;
  sectionId: string | null;
};

interface SectionedContentListProps {
  sections: Section[];
  lessons: LessonContent[];
  quizzes: Quiz[];
  assignments: Assignment[];
  onEditLesson: (lesson: LessonContent) => void;
  onEditQuiz: (quiz: Quiz) => void;
  onEditAssignment: (assignment: Assignment) => void;
  onDeleteLesson: (id: string) => void;
  onDeleteQuiz: (id: string) => void;
  onDeleteAssignment: (id: string) => void;
  onManageQuizQuestions?: (quiz: Quiz) => void;
  onContentChange?: () => void;
}

const getContentIcon = (type: string, contentType?: string) => {
  if (type === "quiz") return <FileQuestion className="h-4 w-4" />;
  if (type === "assignment") return <ClipboardList className="h-4 w-4" />;
  
  switch (contentType) {
    case "video":
      return <Video className="h-4 w-4" />;
    case "youtube":
    case "vimeo":
      return <Youtube className="h-4 w-4" />;
    case "image":
      return <Image className="h-4 w-4" />;
    case "pdf":
    case "text":
    case "note":
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getTypeBadge = (type: string, contentType?: string) => {
  if (type === "quiz") {
    return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Quiz</Badge>;
  }
  if (type === "assignment") {
    return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Assignment</Badge>;
  }
  
  const labelMap: Record<string, string> = {
    text: "Text",
    note: "Note",
    video: "Video",
    youtube: "YouTube",
    vimeo: "Vimeo",
    pdf: "PDF",
    image: "Image",
  };
  
  return <Badge variant="outline">{labelMap[contentType || "text"] || contentType}</Badge>;
};

interface DraggableItemProps {
  item: UnifiedContentItem;
  lessons: LessonContent[];
  quizzes: Quiz[];
  assignments: Assignment[];
  onEdit: (item: UnifiedContentItem) => void;
  onDelete: (item: UnifiedContentItem) => void;
  onManageQuestions?: (item: UnifiedContentItem) => void;
  onPreviewQuiz?: (quiz: Quiz) => void;
  onPreviewAssignment?: (assignment: Assignment) => void;
}

const DraggableItem = ({ item, lessons, quizzes, assignments, onEdit, onDelete, onManageQuestions, onPreviewQuiz, onPreviewAssignment }: DraggableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.uniqueId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handlePreview = () => {
    if (item.type === "quiz" && onPreviewQuiz) {
      const quiz = quizzes.find((q) => q.id === item.id);
      if (quiz) onPreviewQuiz(quiz);
    } else if (item.type === "assignment" && onPreviewAssignment) {
      const assignment = assignments.find((a) => a.id === item.id);
      if (assignment) onPreviewAssignment(assignment);
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center gap-3 p-3 bg-background border rounded-lg hover:bg-muted/50 transition-colors ${isDragging ? "bg-muted shadow-lg" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
      >
        <GripVertical className="h-4 w-4 opacity-50" />
      </button>
      
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {getContentIcon(item.type, item.contentType)}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{item.title}</div>
          {item.description && (
            <div className="text-sm text-muted-foreground truncate">
              {item.description}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {getTypeBadge(item.type, item.contentType)}
        
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {item.type === "lesson" && item.durationMinutes && (
            <span>{item.durationMinutes} min</span>
          )}
          {item.type === "lesson" && item.isFreePreview && (
            <Badge variant="outline" className="ml-1 text-xs">Free</Badge>
          )}
          {item.type === "quiz" && (
            <span>Pass: {item.passingScore}%</span>
          )}
          {item.type === "assignment" && (
            <span>Max: {item.maxScore} pts</span>
          )}
        </div>
        
        <div className="flex gap-1">
          {(item.type === "quiz" || item.type === "assignment") && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreview}
              title="Preview"
              className="h-8 w-8 text-primary"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {item.type === "quiz" && onManageQuestions && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onManageQuestions(item)}
              title="Manage Questions"
              className="h-8 w-8"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(item)}
            title="Edit"
            className="h-8 w-8"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item)}
            title="Delete"
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface DroppableSectionProps {
  sectionId: string | null;
  title: string;
  items: UnifiedContentItem[];
  isExpanded: boolean;
  onToggle: () => void;
  lessons: LessonContent[];
  quizzes: Quiz[];
  assignments: Assignment[];
  onEdit: (item: UnifiedContentItem) => void;
  onDelete: (item: UnifiedContentItem) => void;
  onManageQuestions?: (item: UnifiedContentItem) => void;
  onPreviewQuiz?: (quiz: Quiz) => void;
  onPreviewAssignment?: (assignment: Assignment) => void;
}

const DroppableSection = ({
  sectionId,
  title,
  items,
  isExpanded,
  onToggle,
  lessons,
  quizzes,
  assignments,
  onEdit,
  onDelete,
  onManageQuestions,
  onPreviewQuiz,
  onPreviewAssignment,
}: DroppableSectionProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: sectionId || "unsectioned",
  });

  return (
    <Card className={`transition-colors ${isOver ? "ring-2 ring-primary bg-primary/5" : ""}`}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <FolderOpen className="h-4 w-4 text-primary" />
              {title}
              <Badge variant="secondary" className="ml-auto">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent 
            ref={setNodeRef}
            className={`pt-0 pb-4 min-h-[60px] ${items.length === 0 ? "flex items-center justify-center" : ""}`}
          >
            {items.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">
                Drag content here to add to this section
              </p>
            ) : (
              <SortableContext
                items={items.map(item => item.uniqueId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {items.map((item) => (
                    <DraggableItem
                      key={item.uniqueId}
                      item={item}
                      lessons={lessons}
                      quizzes={quizzes}
                      assignments={assignments}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onManageQuestions={onManageQuestions}
                      onPreviewQuiz={onPreviewQuiz}
                      onPreviewAssignment={onPreviewAssignment}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export const SectionedContentList = ({
  sections,
  lessons,
  quizzes,
  assignments,
  onEditLesson,
  onEditQuiz,
  onEditAssignment,
  onDeleteLesson,
  onDeleteQuiz,
  onDeleteAssignment,
  onManageQuizQuestions,
  onContentChange,
}: SectionedContentListProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([...sections.map(s => s.id), "unsectioned"])
  );
  const [activeItem, setActiveItem] = useState<UnifiedContentItem | null>(null);

  // Preview state
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [previewQuizQuestions, setPreviewQuizQuestions] = useState<QuizQuestion[]>([]);
  const [previewQuizOptions, setPreviewQuizOptions] = useState<Record<string, QuizOption[]>>({});
  const [quizPreviewOpen, setQuizPreviewOpen] = useState(false);
  
  const [previewAssignment, setPreviewAssignment] = useState<Assignment | null>(null);
  const [assignmentPreviewOpen, setAssignmentPreviewOpen] = useState(false);

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

  // Create unified content items with section info
  const unifiedContent = useMemo<UnifiedContentItem[]>(() => {
    const items: UnifiedContentItem[] = [
      ...lessons.map((lesson) => ({
        id: lesson.id,
        uniqueId: `lesson-${lesson.id}`,
        title: lesson.title,
        description: lesson.description,
        order_index: lesson.order_index,
        type: "lesson" as const,
        contentType: lesson.content_type,
        durationMinutes: lesson.duration_minutes,
        isFreePreview: lesson.is_free_preview,
        sectionId: lesson.section_id || null,
      })),
      ...quizzes.map((quiz) => ({
        id: quiz.id,
        uniqueId: `quiz-${quiz.id}`,
        title: quiz.title,
        description: quiz.description,
        order_index: quiz.order_index,
        type: "quiz" as const,
        passingScore: quiz.passing_score,
        sectionId: quiz.section_id || null,
      })),
      ...assignments.map((assignment) => ({
        id: assignment.id,
        uniqueId: `assignment-${assignment.id}`,
        title: assignment.title,
        description: assignment.description,
        order_index: assignment.order_index,
        type: "assignment" as const,
        maxScore: assignment.max_score,
        dueDate: assignment.due_date,
        sectionId: assignment.section_id || null,
      })),
    ];
    return items.sort((a, b) => a.order_index - b.order_index);
  }, [lessons, quizzes, assignments]);

  // Group content by section
  const contentBySection = useMemo(() => {
    const grouped: Record<string, UnifiedContentItem[]> = {
      unsectioned: [],
    };
    
    sections.forEach(section => {
      grouped[section.id] = [];
    });
    
    unifiedContent.forEach(item => {
      if (item.sectionId && grouped[item.sectionId]) {
        grouped[item.sectionId].push(item);
      } else {
        grouped.unsectioned.push(item);
      }
    });
    
    // Sort within each section
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.order_index - b.order_index);
    });
    
    return grouped;
  }, [unifiedContent, sections]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = unifiedContent.find(i => i.uniqueId === active.id);
    setActiveItem(item || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      // Expand section when dragging over it
      const overId = String(over.id);
      if (overId === "unsectioned" || sections.some(s => s.id === overId)) {
        setExpandedSections(prev => new Set([...prev, overId]));
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    
    // Find the dragged item
    const draggedItem = unifiedContent.find(i => i.uniqueId === activeId);
    if (!draggedItem) return;

    // Determine target section and position
    let targetSectionId: string | null = null;
    let targetIndex: number | null = null;
    const overItem = unifiedContent.find(i => i.uniqueId === overId);
    
    // Check if dropped on a section droppable
    if (overId === "unsectioned") {
      targetSectionId = null;
    } else if (sections.some(s => s.id === overId)) {
      targetSectionId = overId;
    } else if (overItem) {
      // Dropped on another item - use that item's section and position
      targetSectionId = overItem.sectionId;
      targetIndex = overItem.order_index;
    }

    const sectionChanged = draggedItem.sectionId !== targetSectionId;
    const sectionKey = targetSectionId || "unsectioned";
    const sectionItems = contentBySection[sectionKey] || [];
    
    // Check if reordering within same section
    const isReorderingWithinSection = !sectionChanged && overItem && draggedItem.uniqueId !== overItem.uniqueId;

    if (sectionChanged || isReorderingWithinSection) {
      try {
        const tableName = draggedItem.type === "lesson" 
          ? "lesson_content" 
          : draggedItem.type === "quiz" 
            ? "quizzes" 
            : "assignments";

        if (sectionChanged) {
          // Moving to different section
          const { error } = await supabase
            .from(tableName)
            .update({ section_id: targetSectionId })
            .eq("id", draggedItem.id);

          if (error) throw error;

          toast({
            title: "Content moved",
            description: `"${draggedItem.title}" moved to ${targetSectionId ? sections.find(s => s.id === targetSectionId)?.title : "Unsectioned"}`,
          });
        }

        if (isReorderingWithinSection && overItem) {
          // Reordering within the same section
          const oldIndex = sectionItems.findIndex(i => i.uniqueId === draggedItem.uniqueId);
          const newIndex = sectionItems.findIndex(i => i.uniqueId === overItem.uniqueId);

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            // Create new order
            const reorderedItems = [...sectionItems];
            const [movedItem] = reorderedItems.splice(oldIndex, 1);
            reorderedItems.splice(newIndex, 0, movedItem);

            // Update order_index for all items in the section
            const updatePromises = reorderedItems.map((item, index) => {
              const itemTableName = item.type === "lesson" 
                ? "lesson_content" 
                : item.type === "quiz" 
                  ? "quizzes" 
                  : "assignments";
              
              return supabase
                .from(itemTableName)
                .update({ order_index: index })
                .eq("id", item.id);
            });

            await Promise.all(updatePromises);

            toast({
              title: "Content reordered",
              description: `"${draggedItem.title}" moved to position ${newIndex + 1}`,
            });
          }
        }

        onContentChange?.();
      } catch (error) {
        console.error("Error moving content:", error);
        toast({
          title: "Error",
          description: "Failed to move content",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (item: UnifiedContentItem) => {
    if (item.type === "lesson") {
      const lesson = lessons.find((l) => l.id === item.id);
      if (lesson) onEditLesson(lesson);
    } else if (item.type === "quiz") {
      const quiz = quizzes.find((q) => q.id === item.id);
      if (quiz) onEditQuiz(quiz);
    } else if (item.type === "assignment") {
      const assignment = assignments.find((a) => a.id === item.id);
      if (assignment) onEditAssignment(assignment);
    }
  };

  const handleDelete = (item: UnifiedContentItem) => {
    if (item.type === "lesson") {
      onDeleteLesson(item.id);
    } else if (item.type === "quiz") {
      onDeleteQuiz(item.id);
    } else if (item.type === "assignment") {
      onDeleteAssignment(item.id);
    }
  };

  const handleManageQuestions = (item: UnifiedContentItem) => {
    if (item.type === "quiz" && onManageQuizQuestions) {
      const quiz = quizzes.find((q) => q.id === item.id);
      if (quiz) onManageQuizQuestions(quiz);
    }
  };

  const handlePreviewQuiz = async (quiz: Quiz) => {
    setPreviewQuiz(quiz);
    
    const { data: questionsData } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quiz.id)
      .order("order_index");
    
    setPreviewQuizQuestions(questionsData || []);
    
    if (questionsData && questionsData.length > 0) {
      const questionIds = questionsData.map(q => q.id);
      const { data: optionsData } = await supabase
        .from("quiz_options")
        .select("*")
        .in("question_id", questionIds)
        .order("order_index");
      
      const optionsByQuestion: Record<string, QuizOption[]> = {};
      optionsData?.forEach(opt => {
        if (!optionsByQuestion[opt.question_id]) {
          optionsByQuestion[opt.question_id] = [];
        }
        optionsByQuestion[opt.question_id].push(opt);
      });
      setPreviewQuizOptions(optionsByQuestion);
    } else {
      setPreviewQuizOptions({});
    }
    
    setQuizPreviewOpen(true);
  };

  const handlePreviewAssignment = (assignment: Assignment) => {
    setPreviewAssignment(assignment);
    setAssignmentPreviewOpen(true);
  };

  if (unifiedContent.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No content yet. Add lessons, quizzes, or assignments to get started.</p>
      </div>
    );
  }

  // Only show level-2 (Unit) sections in the content list - content goes directly under Units
  const unitSections = [...sections]
    .filter(s => (s.section_level || 1) === 2)
    .sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-4 mt-6 pt-6 border-t">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Course Content</h3>
          <p className="text-sm text-muted-foreground">
            Drag and drop content to organize within Unit sections
          </p>
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {/* Render only level-2 (Unit) sections */}
          {unitSections.map((section) => (
            <DroppableSection
              key={section.id}
              sectionId={section.id}
              title={section.title}
              items={contentBySection[section.id] || []}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              lessons={lessons}
              quizzes={quizzes}
              assignments={assignments}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onManageQuestions={handleManageQuestions}
              onPreviewQuiz={handlePreviewQuiz}
              onPreviewAssignment={handlePreviewAssignment}
            />
          ))}
          
          {/* Unsectioned content */}
          {(contentBySection.unsectioned?.length > 0 || unitSections.length > 0) && (
            <DroppableSection
              sectionId={null}
              title="Unsectioned Content"
              items={contentBySection.unsectioned || []}
              isExpanded={expandedSections.has("unsectioned")}
              onToggle={() => toggleSection("unsectioned")}
              lessons={lessons}
              quizzes={quizzes}
              assignments={assignments}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onManageQuestions={handleManageQuestions}
              onPreviewQuiz={handlePreviewQuiz}
              onPreviewAssignment={handlePreviewAssignment}
            />
          )}
        </div>

        <DragOverlay>
          {activeItem && (
            <div className="flex items-center gap-3 p-3 bg-background border rounded-lg shadow-xl opacity-90">
              <GripVertical className="h-4 w-4 opacity-50" />
              <div className="flex items-center gap-2">
                {getContentIcon(activeItem.type, activeItem.contentType)}
                <span className="font-medium">{activeItem.title}</span>
              </div>
              {getTypeBadge(activeItem.type, activeItem.contentType)}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Quiz Preview Dialog */}
      {previewQuiz && (
        <QuizPreview
          quiz={{
            ...previewQuiz,
            time_limit_minutes: previewQuiz.time_limit_minutes ?? null,
          }}
          questions={previewQuizQuestions}
          options={previewQuizOptions}
          open={quizPreviewOpen}
          onOpenChange={setQuizPreviewOpen}
        />
      )}

      {/* Assignment Preview Dialog */}
      {previewAssignment && (
        <AssignmentPreview
          assignment={previewAssignment}
          open={assignmentPreviewOpen}
          onOpenChange={setAssignmentPreviewOpen}
        />
      )}
    </div>
  );
};
