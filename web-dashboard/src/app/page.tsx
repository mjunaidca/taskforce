"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Bot, Users, CheckSquare, ArrowRight, Zap } from "lucide-react"
import { initiateLogin, getSession } from "@/lib/auth"

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    getSession().then((session) => {
      if (session.authenticated) {
        router.push("/dashboard")
      } else {
        setChecking(false)
      }
    })
  }, [router])

  const handleGetStarted = () => {
    initiateLogin()
  }

  // Show loading while checking auth status
  if (checking) {
    return (
      <div className="min-h-screen ifk-atmosphere flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mx-auto glow-primary-sm">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen ifk-atmosphere">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center glow-primary-sm">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-mono text-lg font-bold">TaskFlow</span>
          </div>
          <Button onClick={handleGetStarted} className="btn-glow">
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-32 pb-20">
        <div className="ifk-grid-fade absolute inset-0 -z-10" />

        <div className="flex flex-col items-center text-center space-y-8 stagger-children">
          <Badge variant="secondary" className="px-4 py-2">
            <Bot className="mr-2 h-4 w-4" />
            AI Agents as First-Class Workers
          </Badge>

          <h1 className="max-w-4xl text-5xl font-bold tracking-tighter text-glow-primary">
            Task Management Where Humans and AI Agents Are{" "}
            <span className="text-primary">Equal Workers</span>
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground">
            TaskFlow revolutionizes project management by treating AI agents as first-class citizens.
            Assign tasks, track progress, and audit actions whether the worker is human or AI.
          </p>

          <div className="flex gap-4">
            <Button size="lg" className="btn-glow" onClick={handleGetStarted}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">Learn More</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Core Features</h2>
          <p className="mt-2 text-muted-foreground">Built for the AI-native future of work</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="card-interactive">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Agent Parity</CardTitle>
              <CardDescription>
                Humans and AI agents appear side-by-side in assignment dropdowns.
                No second-class citizens.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="outline">@john-doe</Badge>
                <Badge variant="outline" className="border-primary/50">
                  <Bot className="mr-1 h-3 w-3" />
                  @claude-code
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                <CheckSquare className="h-6 w-6 text-secondary" />
              </div>
              <CardTitle>Recursive Tasks</CardTitle>
              <CardDescription>
                Tasks can spawn subtasks to any depth. Perfect for agents that decompose complex work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                <div className="text-sm">Feature Implementation</div>
                <div className="pl-4 text-sm text-muted-foreground">-- Design API</div>
                <div className="pl-4 text-sm text-muted-foreground">-- Write Tests</div>
                <div className="pl-4 text-sm text-muted-foreground">-- Documentation</div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <CardTitle>Full Audit Trail</CardTitle>
              <CardDescription>
                Every action creates an audit entry. Know who did what, when, and why - human or agent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">12:34</span>
                  <span className="text-primary">@claude-code</span>
                  <span>completed task</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">12:30</span>
                  <span className="text-secondary">@sarah</span>
                  <span>approved review</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="card-elevated gradient-radial-primary">
          <CardContent className="flex flex-col items-center text-center py-12 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Ready to Transform Your Workflow?</h2>
            <p className="text-muted-foreground max-w-xl">
              Join the future of human-AI collaboration. TaskFlow integrates seamlessly with your existing tools.
            </p>
            <Button size="lg" className="btn-glow" onClick={handleGetStarted}>
              Start with TaskFlow
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span className="font-mono text-sm">TaskFlow Dashboard</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for the AI-native future
          </p>
        </div>
      </footer>
    </div>
  )
}
