import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Download, TrendingUp, MessageSquare, Users, ThumbsUp, ThumbsDown } from "lucide-react";
import { useLocation } from "wouter";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Analytics() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/properties");
      return res.json();
    },
  });

  const getDateRange = () => {
    const now = new Date();
    const ranges = {
      "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      "90d": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      "all": undefined,
    };
    return ranges[dateRange];
  };

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/analytics", selectedPropertyId, dateRange],
    queryFn: async () => {
      const startDate = getDateRange();
      const params = new URLSearchParams();
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId);
      if (startDate) params.append("startDate", startDate.toISOString());
      const res = await apiRequest("GET", `/api/analytics?${params.toString()}`);
      return res.json();
    },
    enabled: !!user,
  });

  const { data: feedbackStats } = useQuery({
    queryKey: ["/api/feedback/stats", selectedPropertyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPropertyId) params.append("propertyId", selectedPropertyId);
      const res = await apiRequest("GET", `/api/feedback/stats?${params.toString()}`);
      return res.json();
    },
    enabled: !!user,
  });

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const analyticsData = analytics || {
    totalMessages: 0,
    totalConversations: 0,
    messagesByDay: [],
    messagesByLanguage: [],
    messagesByCategory: [],
    topQuestions: [],
    averageResponseTime: 0,
    feedbackStats: { helpful: 0, notHelpful: 0, total: 0 },
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation("/host")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
            <CardDescription>Filtrez les statistiques par propriété et période</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Select value={selectedPropertyId || "all"} onValueChange={(v) => setSelectedPropertyId(v === "all" ? undefined : v)}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Toutes les propriétés" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les propriétés</SelectItem>
                  {properties?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 derniers jours</SelectItem>
                  <SelectItem value="30d">30 derniers jours</SelectItem>
                  <SelectItem value="90d">90 derniers jours</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Chargement des statistiques...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.totalMessages}</div>
                  <p className="text-xs text-muted-foreground">Tous les messages</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversations</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.totalConversations}</div>
                  <p className="text-xs text-muted-foreground">Conversations actives</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Feedback Positif</CardTitle>
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.feedbackStats.helpful}</div>
                  <p className="text-xs text-muted-foreground">
                    {analyticsData.feedbackStats.total > 0
                      ? `${Math.round((analyticsData.feedbackStats.helpful / analyticsData.feedbackStats.total) * 100)}% satisfaction`
                      : "Aucun feedback"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Feedback Négatif</CardTitle>
                  <ThumbsDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.feedbackStats.notHelpful}</div>
                  <p className="text-xs text-muted-foreground">
                    {analyticsData.feedbackStats.total > 0
                      ? `${Math.round((analyticsData.feedbackStats.notHelpful / analyticsData.feedbackStats.total) * 100)}%`
                      : "Aucun feedback"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Messages by Language */}
              {analyticsData.messagesByLanguage.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Messages par Langue</CardTitle>
                    <CardDescription>Répartition des messages selon la langue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analyticsData.messagesByLanguage}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {analyticsData.messagesByLanguage.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Messages by Category */}
              {analyticsData.messagesByCategory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Messages par Catégorie</CardTitle>
                    <CardDescription>Répartition des questions par catégorie</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.messagesByCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Top Questions */}
            {analyticsData.topQuestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Questions les Plus Fréquentes</CardTitle>
                  <CardDescription>Les questions les plus posées par les voyageurs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.topQuestions.slice(0, 10).map((q: any, index: number) => (
                      <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{q.question}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Posée {q.count} fois
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

