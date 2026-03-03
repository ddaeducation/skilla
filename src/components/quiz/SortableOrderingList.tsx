import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableItemProps {
  id: string;
  index: number;
  text: string;
}

const SortableItem = ({ id, index, text }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-lg border bg-muted/30 ${isDragging ? "shadow-lg ring-2 ring-primary/30" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded hover:bg-muted"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
      </button>
      <span className="text-muted-foreground w-6 text-center font-medium">{index + 1}.</span>
      <span className="flex-1">{text}</span>
    </div>
  );
};

interface SortableOrderingListProps {
  items: { id: string; text: string }[];
  onReorder: (newIds: string[]) => void;
}

export const SortableOrderingList = ({ items, onReorder }: SortableOrderingListProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems.map((i) => i.id));
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Drag the items to arrange them in the correct order.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, idx) => (
            <SortableItem key={item.id} id={item.id} index={idx} text={item.text} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};
