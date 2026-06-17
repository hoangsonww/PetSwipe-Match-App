import React, { useState, useEffect, useRef } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Layout } from "@/components/Layout";
import { useUser } from "@/hooks/useUser";
import { conversationApi, Conversation, Message } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Clock,
  User,
  Building,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const fetchConversations = () => conversationApi.listConversations();

const Messages: NextPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: conversations,
    error,
    mutate: mutateConversations,
  } = useSWR<Conversation[]>(
    user ? "conversations" : null,
    fetchConversations
  );

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await conversationApi.getMessages(conversationId);
      setMessages(msgs);
    } catch (err) {
      toast.error("Failed to load messages");
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    setSending(true);
    try {
      const message = await conversationApi.sendMessage(
        selectedConversation,
        newMessage.trim()
      );
      setMessages(prev => [...prev, message]);
      setNewMessage("");
      // Refresh conversations to update last message
      mutateConversations();
    } catch (err) {
      toast.error("Failed to send message");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const selectedConv = conversations?.find(c => c.id === selectedConversation);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-20 w-20 animate-spin text-[#7097A8]" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null; // Redirecting
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-red-600">Failed to load conversations</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Messages - PetSwipe</title>
        <meta name="description" content="Chat with shelters about pets you're interested in" />
      </Head>
      <Layout>
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
            <div className="flex items-center gap-4">
              {selectedConversation && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-[#7097A8]" />
                <h1 className="text-xl font-bold text-[#234851] dark:text-white">
                  {selectedConv ? selectedConv.pet.name : "Messages"}
                </h1>
              </div>
              {selectedConv && (
                <Badge variant="secondary" className="ml-auto">
                  {selectedConv.pet.shelterName}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Conversations List */}
            <div className={`w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${selectedConversation ? 'hidden md:block' : ''}`}>
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Conversations
                  </h2>
                </div>
                <ScrollArea className="flex-1">
                  {!conversations ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-[#7097A8]" />
                      <p className="text-sm text-gray-500">Loading conversations...</p>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                        No conversations yet
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Start by liking a pet to begin a conversation with their shelter
                      </p>
                      <Button onClick={() => router.push("/home")} size="sm">
                        Browse Pets
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2">
                      {conversations.map((conv) => (
                        <motion.div
                          key={conv.id}
                          whileHover={{ backgroundColor: "rgba(112, 151, 168, 0.05)" }}
                          onClick={() => setSelectedConversation(conv.id)}
                          className={`p-3 rounded-lg cursor-pointer border mb-2 transition-all ${
                            selectedConversation === conv.id
                              ? "bg-[#7097A8]/10 border-[#7097A8]"
                              : "border-gray-200 dark:border-gray-700 hover:border-[#7097A8]/50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12 ring-2 ring-[#7097A8]/20">
                              <AvatarImage src={conv.pet.photoUrl} alt={conv.pet.name} />
                              <AvatarFallback>{conv.pet.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                  {conv.pet.name}
                                </h3>
                                {conv.unreadCount > 0 && (
                                  <Badge variant="destructive" className="ml-2">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mb-1">
                                {conv.pet.shelterName}
                              </p>
                              {conv.lastMessage && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                  {conv.lastMessage.sender === "user" ? "You: " : ""}
                                  {conv.lastMessage.content}
                                </p>
                              )}
                              {conv.lastMessageAt && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatTime(conv.lastMessageAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Messages View */}
            <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-gray-800 ${!selectedConversation ? 'hidden md:flex' : ''}`}>
              {!selectedConversation ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-gray-500">
                      Choose a conversation from the list to start messaging
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Messages Area */}
                  <ScrollArea className="flex-1 p-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-[#7097A8]" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${
                              message.sender === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                message.sender === "user"
                                  ? "bg-[#7097A8] text-white"
                                  : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {message.sender === "shelter" && (
                                  <Building className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                )}
                                {message.sender === "user" && (
                                  <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm">{message.content}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock className="h-3 w-3 opacity-60" />
                                    <p className="text-xs opacity-60">
                                      {formatTime(message.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-1"
                        disabled={sending}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim()}
                        size="icon"
                        className="bg-[#7097A8] hover:bg-[#5f868d]"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Messages;