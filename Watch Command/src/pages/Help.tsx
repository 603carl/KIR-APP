import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  Book,
  Video,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  ExternalLink,
  HelpCircle,
  Zap,
  Users,
  Shield,
  BarChart3,
  Map
} from "lucide-react";

const quickLinks = [
  { icon: Zap, title: 'Quick Start Guide', description: 'Get started with the basics', color: 'hsl(var(--chart-1))' },
  { icon: Users, title: 'Team Management', description: 'Learn to manage teams', color: 'hsl(var(--chart-2))' },
  { icon: Shield, title: 'Security Best Practices', description: 'Keep your data secure', color: 'hsl(var(--chart-3))' },
  { icon: BarChart3, title: 'Analytics Guide', description: 'Understanding your data', color: 'hsl(var(--chart-4))' },
  { icon: Map, title: 'Map Features', description: 'Using the live map', color: 'hsl(var(--chart-5))' },
  { icon: FileText, title: 'Report Generation', description: 'Create custom reports', color: 'hsl(var(--primary))' },
];

const faqs = [
  {
    question: 'How do I create a new incident report?',
    answer: 'Navigate to the Incidents page and click the "New Incident" button. Fill in the required fields including title, category, severity, location, and description. You can also attach photos or videos as evidence.'
  },
  {
    question: 'How do I assign an incident to a team?',
    answer: 'Open the incident details and click on "Assign Team" button. Select the appropriate team from the dropdown menu. The team lead will receive a notification about the new assignment.'
  },
  {
    question: 'What do the different severity levels mean?',
    answer: 'Critical: Immediate life-threatening situations. High: Significant impact requiring urgent attention. Medium: Important issues that need timely resolution. Low: Minor issues that can be scheduled. Info: Informational reports for tracking purposes.'
  },
  {
    question: 'How do I export incident data?',
    answer: 'Go to the Reports page and select "Quick Export" or create a custom report. You can export data in CSV, Excel, or PDF formats. Use filters to select specific date ranges, categories, or counties.'
  },
  {
    question: 'How do I set up custom alerts?',
    answer: 'Navigate to the Alerts page and click "Create Alert Rule". Define your conditions (e.g., severity = critical), select notification channels (email, SMS, push), and enable the rule.'
  },
  {
    question: 'Can I track incidents on the map in real-time?',
    answer: 'Yes! The Live Map page shows all incidents with real-time updates. You can filter by category, severity, and time period. Incident markers are color-coded by severity and update every 5 seconds.'
  },
  {
    question: 'How do I add new users to the system?',
    answer: 'Go to Users page and click "Add User". Fill in the user details, assign a role (Admin, Supervisor, Agent, or Viewer), and set their county assignment. They will receive an email with login credentials.'
  },
  {
    question: 'What is the difference between user roles?',
    answer: 'Super Admin: Full system access. Admin: Manage users, incidents, teams. Supervisor: Manage team members and assign incidents. Agent: Handle assigned incidents. Viewer: Read-only access to reports and data.'
  },
];

export default function Help() {
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Find answers, learn best practices, and get support for the Kenya Incident Reporter system
        </p>
        
        {/* Search */}
        <div className="relative max-w-xl mx-auto mt-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search for help articles, guides, or FAQs..." 
            className="pl-12 h-12 text-base"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {quickLinks.map((link) => (
          <Card key={link.title} className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `${link.color}20` }}
              >
                <link.icon className="h-6 w-6" style={{ color: link.color }} />
              </div>
              <p className="text-sm font-medium">{link.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>Quick answers to common questions</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Support Options */}
        <div className="space-y-4">
          {/* Contact Support */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Contact Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-2">
                <MessageCircle className="h-4 w-4" />
                Live Chat
                <Badge variant="secondary" className="ml-auto">Online</Badge>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Mail className="h-4 w-4" />
                support@kenya-incidents.go.ke
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Phone className="h-4 w-4" />
                +254 700 123 456
              </Button>
            </CardContent>
          </Card>

          {/* Resources */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a href="#" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                <Book className="h-4 w-4" />
                Documentation
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
              <a href="#" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                <Video className="h-4 w-4" />
                Video Tutorials
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
              <a href="#" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                <FileText className="h-4 w-4" />
                API Documentation
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
              <a href="#" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                <Users className="h-4 w-4" />
                Community Forum
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API</span>
                  <Badge variant="outline" className="text-severity-low border-severity-low">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <Badge variant="outline" className="text-severity-low border-severity-low">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Real-time</span>
                  <Badge variant="outline" className="text-severity-low border-severity-low">Operational</Badge>
                </div>
              </div>
              <Button variant="link" className="p-0 h-auto mt-3 text-xs">
                View Status Page <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Version Info */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center text-sm text-muted-foreground">
                <p>Kenya Incident Reporter</p>
                <p className="font-mono">Version 2.4.1</p>
                <p className="text-xs mt-1">Last updated: January 2026</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
