import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { MessageCircle, Plus, Loader2, Send, ArrowLeft, Search, Calendar, X } from "lucide-react";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerEmail: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface MessagesPanelProps {
  userId: string;
  isAdmin?: boolean;
}

export const MessagesPanel = ({ userId, isAdmin = false }: MessagesPanelProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMessageContent, setNewMessageContent] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [newConversationMessage, setNewConversationMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"conversations" | "all">(isAdmin ? "all" : "conversations");

  useEffect(() => {
    fetchMessages();
    fetchProfiles();

    const channel = supabase
      .channel("messages-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedConversation]);

  const fetchMessages = async () => {
    try {
      // For admins, fetch all messages; otherwise only user's messages
      let query = supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!isAdmin) {
        query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAllMessages((data as Message[]) || []);
      setMessages((data as Message[]) || []);
      buildConversations(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (error) throw error;
      setProfiles((data as Profile[]) || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const buildConversations = async (msgs: Message[]) => {
    const convMap = new Map<string, Conversation>();

    for (const msg of msgs) {
      const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          partnerId,
          partnerName: "",
          partnerEmail: null,
          lastMessage: msg.content,
          lastMessageAt: msg.created_at,
          unreadCount: 0,
        });
      }

      if (msg.recipient_id === userId && !msg.is_read) {
        const conv = convMap.get(partnerId)!;
        conv.unreadCount++;
      }
    }

    // Fetch partner names
    const partnerIds = Array.from(convMap.keys());
    if (partnerIds.length > 0) {
      const { data: partnerProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", partnerIds);

      if (partnerProfiles) {
        for (const profile of partnerProfiles) {
          const conv = convMap.get(profile.id);
          if (conv) {
            conv.partnerName = profile.full_name || "Unknown";
            conv.partnerEmail = profile.email;
          }
        }
      }
    }

    setConversations(Array.from(convMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    ));
  };

  // Filter messages for "all messages" view
  const filteredMessages = allMessages.filter((msg) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!msg.content.toLowerCase().includes(query)) return false;
    }
    
    // User filter
    if (userFilter !== "all") {
      if (msg.sender_id !== userFilter && msg.recipient_id !== userFilter) return false;
    }
    
    // Date range filter
    const msgDate = new Date(msg.created_at);
    if (dateFrom && isBefore(msgDate, startOfDay(dateFrom))) return false;
    if (dateTo && isAfter(msgDate, endOfDay(dateTo))) return false;
    
    return true;
  });

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!conv.partnerName.toLowerCase().includes(query) && 
          !conv.lastMessage.toLowerCase().includes(query)) return false;
    }
    
    if (userFilter !== "all" && conv.partnerId !== userFilter) return false;
    
    if (dateFrom || dateTo) {
      const convDate = new Date(conv.lastMessageAt);
      if (dateFrom && isBefore(convDate, startOfDay(dateFrom))) return false;
      if (dateTo && isAfter(convDate, endOfDay(dateTo))) return false;
    }
    
    return true;
  });

  // Use pagination hooks
  const messagesPagination = usePagination(filteredMessages, { pageSize: 4 });
  const conversationsPagination = usePagination(filteredConversations, { pageSize: 4 });

  const clearFilters = () => {
    setSearchQuery("");
    setUserFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchQuery || userFilter !== "all" || dateFrom || dateTo;

  const getProfileName = (id: string) => {
    const profile = profiles.find(p => p.id === id);
    return profile?.full_name || profile?.email || "Unknown";
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessageContent.trim()) return;

    try {
      // Get sender name for notification
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: selectedConversation,
        content: newMessageContent,
      });

      if (error) throw error;

      // Send email notification in background
      supabase.functions.invoke("send-notification", {
        body: {
          type: "message",
          message: {
            sender_name: senderProfile?.full_name || "Someone",
            recipient_id: selectedConversation,
            content: newMessageContent,
          },
        },
      }).catch((err) => console.error("Failed to send notification:", err));

      setNewMessageContent("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
  };

  const handleStartConversation = async () => {
    if (!selectedRecipient || !newConversationMessage.trim()) return;

    try {
      // Get sender name for notification
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: selectedRecipient,
        content: newConversationMessage,
      });

      if (error) throw error;

      // Send email notification in background
      supabase.functions.invoke("send-notification", {
        body: {
          type: "message",
          message: {
            sender_name: senderProfile?.full_name || "Someone",
            recipient_id: selectedRecipient,
            content: newConversationMessage,
          },
        },
      }).catch((err) => console.error("Failed to send notification:", err));

      toast({ title: "Message sent" });
      setDialogOpen(false);
      setSelectedRecipient("");
      setNewConversationMessage("");
      setSelectedConversation(selectedRecipient);
      fetchMessages();
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
  };

  const markAsRead = async (partnerId: string) => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", partnerId)
      .eq("recipient_id", userId);
  };

  const openConversation = (partnerId: string) => {
    setSelectedConversation(partnerId);
    markAsRead(partnerId);
  };

  const conversationMessages = selectedConversation
    ? messages
        .filter(
          (m) =>
            (m.sender_id === userId && m.recipient_id === selectedConversation) ||
            (m.sender_id === selectedConversation && m.recipient_id === userId)
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : [];

  const selectedPartner = conversations.find((c) => c.partnerId === selectedConversation);
  const availableRecipients = profiles.filter((p) => p.id !== userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (selectedConversation) {
    return (
      <div className="flex flex-col h-[500px]">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold">{selectedPartner?.partnerName || "Conversation"}</h3>
        </div>

        <Card className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {conversationMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 ${
                      msg.sender_id === userId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender_id === userId ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {format(new Date(msg.created_at), "p")}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t flex gap-2">
            <Input
              value={newMessageContent}
              onChange={(e) => setNewMessageContent(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} disabled={!newMessageContent.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* View Mode Toggle (for admins) */}
          {isAdmin && (
            <div className="min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1 block">View</Label>
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as "conversations" | "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conversations">My Conversations</SelectItem>
                  <SelectItem value="all">All Messages</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* User Filter */}
          <div className="min-w-[180px]">
            <Label className="text-xs text-muted-foreground mb-1 block">User</Label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="min-w-[140px]">
            <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date To */}
          <div className="min-w-[140px]">
            <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
        
        {hasActiveFilters && (
          <p className="text-sm text-muted-foreground mt-2">
            {viewMode === "all" 
              ? `Showing ${filteredMessages.length} of ${allMessages.length} messages`
              : `Showing ${filteredConversations.length} of ${conversations.length} conversations`
            }
          </p>
        )}
      </Card>

      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient</Label>
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRecipients.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Input
                  value={newConversationMessage}
                  onChange={(e) => setNewConversationMessage(e.target.value)}
                  placeholder="Type your message..."
                />
              </div>
              <Button 
                onClick={handleStartConversation} 
                className="w-full" 
                disabled={!selectedRecipient || !newConversationMessage.trim()}
              >
                Send Message
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* All Messages View (for admins) */}
      {viewMode === "all" && isAdmin ? (
        filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {hasActiveFilters ? "No messages match your filters" : "No messages yet"}
              </h3>
              <p className="text-muted-foreground">
                {hasActiveFilters ? "Try adjusting your filters" : "Messages will appear here"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {messagesPagination.paginatedItems.map((msg) => (
              <Card key={msg.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          From: {getProfileName(msg.sender_id)}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline" className="text-xs">
                          To: {getProfileName(msg.recipient_id)}
                        </Badge>
                        {!msg.is_read && (
                          <Badge variant="secondary" className="text-xs">Unread</Badge>
                        )}
                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(msg.created_at), "PP p")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Pagination Controls */}
            <PaginationControls
              currentPage={messagesPagination.currentPage}
              totalPages={messagesPagination.totalPages}
              onPageChange={messagesPagination.goToPage}
              startIndex={messagesPagination.startIndex}
              endIndex={messagesPagination.endIndex}
              totalItems={messagesPagination.totalItems}
              itemLabel="messages"
            />
          </div>
        )
      ) : (
        /* Conversations View */
        filteredConversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {hasActiveFilters ? "No conversations match your filters" : "No messages yet"}
              </h3>
              <p className="text-muted-foreground">
                {hasActiveFilters ? "Try adjusting your filters" : "Start a conversation with someone"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversationsPagination.paginatedItems.map((conv) => (
              <Card 
                key={conv.partnerId}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => openConversation(conv.partnerId)}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {conv.partnerName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{conv.partnerName}</p>
                        {conv.partnerEmail && (
                          <p className="text-xs text-muted-foreground">{conv.partnerEmail}</p>
                        )}
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {conv.lastMessage}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(conv.lastMessageAt), "PP")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(conv.lastMessageAt), "p")}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge className="mt-1">{conv.unreadCount}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Pagination Controls */}
            <PaginationControls
              currentPage={conversationsPagination.currentPage}
              totalPages={conversationsPagination.totalPages}
              onPageChange={conversationsPagination.goToPage}
              startIndex={conversationsPagination.startIndex}
              endIndex={conversationsPagination.endIndex}
              totalItems={conversationsPagination.totalItems}
              itemLabel="conversations"
            />
          </div>
        )
      )}
    </div>
  );
};
