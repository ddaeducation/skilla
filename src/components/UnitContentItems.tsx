import { useState } from "react";
import { FileText, Video, Youtube, Image, FileQuestion, ClipboardList, Pencil, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

interface ContentItem {
  id: string;
  title: string;
  type: 'lesson' | 'quiz' | 'assignment';
  content_type?: string;
  order_index: number;
  description?: string | null;
  // Quiz specific
  passing_score?: number;
  time_limit_minutes?: number | null;
  // Assignment specific
  max_score?: number;
  due_date?: string | null;
}

interface UnitContentItemsProps {
  items: ContentItem[];
  depth: number;
  sectionId: string;
  onEditLesson?: (id: string) => void;
  onEditQuiz?: (id: string) => void;
  onEditAssignment?: (id: string) => void;
  onDeleteLesson?: (id: string) => void;
  onDeleteQuiz?: (id: string) => void;
  onDeleteAssignment?: (id: string) => void;
  onReorderContent?: (sectionId: string, items: ContentItem[]) => void;
}

const getContentIcon = (item: ContentItem) => {
  if (item.type === 'quiz') return <FileQuestion className="h-4 w-4 text-primary" />;
  if (item.type === 'assignment') return <ClipboardList className="h-4 w-4 text-primary" />;
  
  switch (item.content_type) {
    case 'video':
      return <Video className="h-4 w-4 text-primary" />;
    case 'youtube':
    case 'vimeo':
      return <Youtube className="h-4 w-4 text-destructive" />;
    case 'image':
      return <Image className="h-4 w-4 text-primary" />;
    case 'pdf':
      return <FileText className="h-4 w-4 text-primary" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
};

const getTypeBadge = (item: ContentItem) => {
  if (item.type === 'quiz') {
    return <Badge variant="secondary" className="text-xs">Quiz</Badge>;
  }
  if (item.type === 'assignment') {
    return <Badge variant="secondary" className="text-xs">Assignment</Badge>;
  }
  return <Badge variant="outline" className="text-xs">{item.content_type || 'Lesson'}</Badge>;
};

interface SortableContentItemProps {
  item: ContentItem;
  depth: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

const SortableContentItem = ({ item, depth, onEdit, onDelete }: SortableContentItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${item.type}-${item.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const paddingLeft = (depth + 1) * 24;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, marginLeft: `${paddingLeft}px` }}
      className="flex items-center gap-2 p-2 bg-background rounded border border-border/50 hover:border-border"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
      >
        <GripVertical className="h-3 w-3 opacity-50" />
      </button>
      
      {getContentIcon(item)}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
      </div>
      
      {getTypeBadge(item)}
      
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-7 w-7"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-7 w-7 text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

export const UnitContentItems = ({
  items,
  depth,
  sectionId,
  onEditLesson,
  onEditQuiz,
  onEditAssignment,
  onDeleteLesson,
  onDeleteQuiz,
  onDeleteAssignment,
  onReorderContent,
}: UnitContentItemsProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => `${item.type}-${item.id}` === active.id);
      const newIndex = items.findIndex((item) => `${item.type}-${item.id}` === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(items, oldIndex, newIndex);
        onReorderContent?.(sectionId, newOrder);
      }
    }
  };

  const handleDeleteClick = (item: ContentItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'lesson' && onDeleteLesson) {
      onDeleteLesson(itemToDelete.id);
    } else if (itemToDelete.type === 'quiz' && onDeleteQuiz) {
      onDeleteQuiz(itemToDelete.id);
    } else if (itemToDelete.type === 'assignment' && onDeleteAssignment) {
      onDeleteAssignment(itemToDelete.id);
    }
    
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'lesson': return 'lesson';
      case 'quiz': return 'quiz';
      case 'assignment': return 'assignment';
      default: return 'item';
    }
  };

  if (items.length === 0) {
    const paddingLeft = (depth + 1) * 24;
    return (
      <p 
        className="text-sm text-muted-foreground italic py-2"
        style={{ marginLeft: `${paddingLeft}px` }}
      >
        No content added yet
      </p>
    );
  }

  const itemIds = items.map((item) => `${item.type}-${item.id}`);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-1 py-1">
            {items.map((item) => (
              <SortableContentItem
                key={`${item.type}-${item.id}`}
                item={item}
                depth={depth}
                onEdit={
                  item.type === 'lesson' && onEditLesson ? () => onEditLesson(item.id) :
                  item.type === 'quiz' && onEditQuiz ? () => onEditQuiz(item.id) :
                  item.type === 'assignment' && onEditAssignment ? () => onEditAssignment(item.id) :
                  undefined
                }
                onDelete={() => handleDeleteClick(item)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {itemToDelete ? getTypeLabel(itemToDelete.type) : 'item'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export type { ContentItem };
