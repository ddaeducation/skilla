import { useState, useEffect } from "react";
import { FileText, Video, Youtube, Image, FileQuestion, ClipboardList, GripVertical, Pencil, Trash2, Eye, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { supabase } from "@/integrations/supabase/client";
import { QuizPreview } from "@/components/QuizPreview";
import { AssignmentPreview } from "@/components/AssignmentPreview";

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
}

interface Quiz {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  order_index: number;
  time_limit_minutes?: number | null;
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
}

type UnifiedContentItem = {
  id: string;
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
  originalId: string;
};

interface UnifiedContentListProps {
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
  onReorder?: (items: { id: string; type: "lesson" | "quiz" | "assignment"; newIndex: number }[]) => void;
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

interface SortableRowProps {
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

const SortableRow = ({ item, lessons, quizzes, assignments, onEdit, onDelete, onManageQuestions, onPreviewQuiz, onPreviewAssignment }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handlePreview = () => {
    if (item.type === "quiz" && onPreviewQuiz) {
      const quiz = quizzes.find((q) => q.id === item.originalId);
      if (quiz) onPreviewQuiz(quiz);
    } else if (item.type === "assignment" && onPreviewAssignment) {
      const assignment = assignments.find((a) => a.id === item.originalId);
      if (assignment) onPreviewAssignment(assignment);
    }
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "bg-muted" : ""}>
      <TableCell className="font-medium text-muted-foreground">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          >
            <GripVertical className="h-4 w-4 opacity-50" />
          </button>
          {item.order_index}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {getContentIcon(item.type, item.contentType)}
          <div>
            <div className="font-medium">{item.title}</div>
            {item.description && (
              <div className="text-sm text-muted-foreground line-clamp-1">
                {item.description}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {getTypeBadge(item.type, item.contentType)}
      </TableCell>
      <TableCell>
        <div className="text-sm text-muted-foreground">
          {item.type === "lesson" && item.durationMinutes && (
            <span>{item.durationMinutes} min</span>
          )}
          {item.type === "lesson" && item.isFreePreview && (
            <Badge variant="outline" className="ml-2 text-xs">Free Preview</Badge>
          )}
          {item.type === "quiz" && (
            <span>Pass: {item.passingScore}%</span>
          )}
          {item.type === "assignment" && (
            <span>Max: {item.maxScore} pts</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {(item.type === "quiz" || item.type === "assignment") && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreview}
              title="Preview"
              className="text-primary"
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
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(item)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export const UnifiedContentList = ({
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
  onReorder,
}: UnifiedContentListProps) => {
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

  // Preview state
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [previewQuizQuestions, setPreviewQuizQuestions] = useState<QuizQuestion[]>([]);
  const [previewQuizOptions, setPreviewQuizOptions] = useState<Record<string, QuizOption[]>>({});
  const [quizPreviewOpen, setQuizPreviewOpen] = useState(false);
  
  const [previewAssignment, setPreviewAssignment] = useState<Assignment | null>(null);
  const [assignmentPreviewOpen, setAssignmentPreviewOpen] = useState(false);

  const handlePreviewQuiz = async (quiz: Quiz) => {
    setPreviewQuiz(quiz);
    
    // Fetch questions
    const { data: questionsData } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quiz.id)
      .order("order_index");
    
    setPreviewQuizQuestions(questionsData || []);
    
    // Fetch options
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

  // Combine all content into a single array
  const createUnifiedContent = (): UnifiedContentItem[] => [
    ...lessons.map((lesson) => ({
      id: `lesson-${lesson.id}`,
      originalId: lesson.id,
      title: lesson.title,
      description: lesson.description,
      order_index: lesson.order_index,
      type: "lesson" as const,
      contentType: lesson.content_type,
      durationMinutes: lesson.duration_minutes,
      isFreePreview: lesson.is_free_preview,
    })),
    ...quizzes.map((quiz) => ({
      id: `quiz-${quiz.id}`,
      originalId: quiz.id,
      title: quiz.title,
      description: quiz.description,
      order_index: quiz.order_index,
      type: "quiz" as const,
      passingScore: quiz.passing_score,
    })),
    ...assignments.map((assignment) => ({
      id: `assignment-${assignment.id}`,
      originalId: assignment.id,
      title: assignment.title,
      description: assignment.description,
      order_index: assignment.order_index,
      type: "assignment" as const,
      maxScore: assignment.max_score,
      dueDate: assignment.due_date,
    })),
  ];

  const [sortedContent, setSortedContent] = useState<UnifiedContentItem[]>([]);

  // Update sorted content when props change
  const unifiedContent = createUnifiedContent().sort((a, b) => a.order_index - b.order_index);
  
  // Use the unified content directly for display
  const displayContent = sortedContent.length > 0 ? sortedContent : unifiedContent;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = unifiedContent.findIndex((item) => item.id === active.id);
      const newIndex = unifiedContent.findIndex((item) => item.id === over.id);

      const newOrder = arrayMove(unifiedContent, oldIndex, newIndex);
      
      // Update order_index for each item
      const updatedItems = newOrder.map((item, index) => ({
        ...item,
        order_index: index,
      }));

      setSortedContent(updatedItems);

      // Call the onReorder callback with the new order
      if (onReorder) {
        const reorderData = updatedItems.map((item, index) => ({
          id: item.originalId,
          type: item.type,
          newIndex: index,
        }));
        onReorder(reorderData);
      }
    }
  };

  const handleEdit = (item: UnifiedContentItem) => {
    if (item.type === "lesson") {
      const lesson = lessons.find((l) => l.id === item.originalId);
      if (lesson) onEditLesson(lesson);
    } else if (item.type === "quiz") {
      const quiz = quizzes.find((q) => q.id === item.originalId);
      if (quiz) onEditQuiz(quiz);
    } else if (item.type === "assignment") {
      const assignment = assignments.find((a) => a.id === item.originalId);
      if (assignment) onEditAssignment(assignment);
    }
  };

  const handleDelete = (item: UnifiedContentItem) => {
    if (item.type === "lesson") {
      onDeleteLesson(item.originalId);
    } else if (item.type === "quiz") {
      onDeleteQuiz(item.originalId);
    } else if (item.type === "assignment") {
      onDeleteAssignment(item.originalId);
    }
  };

  const handleManageQuestions = (item: UnifiedContentItem) => {
    if (item.type === "quiz" && onManageQuizQuestions) {
      const quiz = quizzes.find((q) => q.id === item.originalId);
      if (quiz) onManageQuizQuestions(quiz);
    }
  };

  if (displayContent.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No content yet. Add lessons, quizzes, or assignments to get started.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext
            items={displayContent.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {displayContent.map((item) => (
              <SortableRow
                key={item.id}
                item={item}
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
          </SortableContext>
        </TableBody>
      </Table>

      {/* Quiz Preview Dialog */}
      {previewQuiz && (
        <QuizPreview
          quiz={previewQuiz}
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
    </DndContext>
  );
};
