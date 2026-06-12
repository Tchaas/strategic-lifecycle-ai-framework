import { useState } from 'react';
import { ChevronRight, FileText, Github, Menu, X, Check, AlertCircle, Lightbulb, Users, Target, TrendingUp, Database, GitBranch, Shield, BookOpen, FileCode, Activity, Layers, Gauge, PanelTop, ListChecks } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Progress } from './components/ui/progress';
import { Separator } from './components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  const frameworkStages = [
    {
      id: 1,
      title: "Executive Strategic Objectives",
      purpose: "Define high-level business goals and strategic direction",
      keyQuestions: ["What outcomes do we need?", "What business value are we targeting?", "What are our strategic priorities?"],
      aiOpportunity: "Parse strategic documents, identify themes, extract objectives",
      artifact: "Strategic initiative document, executive brief",
      governance: "Executive review and sign-off"
    },
    {
      id: 2,
      title: "Business Architecture Translation",
      purpose: "Translate executive goals into capabilities, value streams, key activities, personas, processes, and information concepts",
      keyQuestions: ["What capabilities do we need?", "What value streams are affected?", "Who are the key stakeholders?"],
      aiOpportunity: "Assist with capability mapping, value stream analysis, persona clustering, and documentation synthesis",
      artifact: "Capability map, value stream map, stakeholder/persona model",
      governance: "Human validation by business architects and stakeholders"
    },
    {
      id: 3,
      title: "Product Discovery",
      purpose: "Validate problem space, understand user needs, and define product direction",
      keyQuestions: ["What problem are we solving?", "Who experiences this problem?", "What would success look like?"],
      aiOpportunity: "Journey mapping, user research synthesis, opportunity prioritization",
      artifact: "Journey maps, opportunity canvas, validated hypotheses",
      governance: "Product owner and stakeholder validation"
    },
    {
      id: 4,
      title: "Gap and Bottleneck Analysis",
      purpose: "Identify gaps between current and desired state",
      keyQuestions: ["What's missing?", "Where are the constraints?", "What dependencies exist?"],
      aiOpportunity: "Process mining, dependency mapping, constraint identification",
      artifact: "Gap analysis report, dependency matrix",
      governance: "Cross-functional team review"
    },
    {
      id: 5,
      title: "Conceptual Architecture",
      purpose: "Define high-level solution structure needed to support implementation readiness",
      keyQuestions: ["What components are needed?", "How do they interact?", "What patterns apply?"],
      aiOpportunity: "Architecture pattern recommendation, component ideation, integration mapping",
      artifact: "Conceptual architecture diagram, component model",
      governance: "Architecture review board approval"
    },
    {
      id: 6,
      title: "AI-Augmented Artifact Generation",
      purpose: "Accelerate creation of documentation and design artifacts",
      keyQuestions: ["What artifacts are needed?", "What quality standards apply?", "How do we maintain consistency?"],
      aiOpportunity: "Template generation, documentation synthesis, diagram creation",
      artifact: "Generated specifications, diagrams, documentation",
      governance: "Technical writer and architect review"
    },
    {
      id: 7,
      title: "Agile / Scrum Translation",
      purpose: "Transform architecture into agile delivery structures",
      keyQuestions: ["What are the epics?", "How do we sequence work?", "What are the acceptance criteria?"],
      aiOpportunity: "Epic generation, story mapping, acceptance criteria drafting",
      artifact: "Epic breakdown, user stories, sprint planning artifacts",
      governance: "Scrum master and team validation"
    },
    {
      id: 8,
      title: "Requirements Definition",
      purpose: "Document detailed functional and non-functional requirements",
      keyQuestions: ["What must the system do?", "What are the constraints?", "What are the quality attributes?"],
      aiOpportunity: "Requirement extraction, completeness checking, traceability mapping",
      artifact: "Requirements specification, traceability matrix",
      governance: "Business analyst and stakeholder approval"
    },
    {
      id: 9,
      title: "Implementation Readiness",
      purpose: "Ensure all prerequisites for development are in place",
      keyQuestions: ["Are requirements clear?", "Are dependencies resolved?", "Is the team ready?"],
      aiOpportunity: "Readiness checklist generation, risk identification, gap flagging",
      artifact: "Readiness assessment, risk register",
      governance: "Program manager and delivery lead sign-off"
    },
    {
      id: 10,
      title: "Strategic Value Measurement",
      purpose: "Track and measure outcomes against strategic objectives",
      keyQuestions: ["Are we achieving our goals?", "What is the business impact?", "What should we adjust?"],
      aiOpportunity: "Metrics tracking, trend analysis, insight generation",
      artifact: "Value dashboard, outcome reports",
      governance: "Executive review and continuous improvement"
    }
  ];

  const aiAugmentationCards = [
    { title: "Strategic initiative interpretation", icon: Target },
    { title: "Stakeholder and persona analysis", icon: Users },
    { title: "Value stream mapping", icon: TrendingUp },
    { title: "Journey mapping", icon: Activity },
    { title: "Process gap analysis", icon: AlertCircle },
    { title: "Requirement generation", icon: FileText },
    { title: "Conceptual architecture ideation", icon: Lightbulb },
    { title: "API and data mapping support", icon: Database },
    { title: "Documentation acceleration", icon: BookOpen },
    { title: "Decision traceability", icon: GitBranch },
    { title: "Governance checkpoint identification", icon: Shield }
  ];

  const useCases = [
    {
      name: "FedEx Network 2.0 / DRIVE",
      goal: "Transform global logistics network for speed and efficiency",
      valueType: "Operational efficiency, cost reduction",
      baFocus: "Network optimization capabilities, route value streams",
      aiOpportunity: "Network topology analysis, route optimization patterns",
      conceptualOutput: "Distributed logistics orchestration architecture",
      metrics: "15% cost reduction, 20% faster delivery times"
    },
    {
      name: "Walmart Next-Generation Supply Chain",
      goal: "Enable real-time inventory and demand-driven fulfillment",
      valueType: "Customer experience, revenue growth",
      baFocus: "Inventory management capabilities, fulfillment value streams",
      aiOpportunity: "Demand forecasting patterns, inventory optimization",
      conceptualOutput: "Event-driven supply chain architecture",
      metrics: "12% inventory reduction, 25% faster replenishment"
    },
    {
      name: "Amazon Fulfillment Regionalization",
      goal: "Reduce delivery times through regional fulfillment centers",
      valueType: "Customer satisfaction, unit-cost reduction",
      baFocus: "Regional fulfillment capabilities, last-mile value streams",
      aiOpportunity: "Regional demand analysis, placement optimization",
      conceptualOutput: "Multi-region fulfillment mesh architecture",
      metrics: "30% faster same-day delivery, 18% cost per unit reduction"
    }
  ];

  const governanceControls = [
    "Human review checkpoints at every lifecycle stage",
    "Explainability requirements for AI-generated artifacts",
    "Prompt dependency controls and version tracking",
    "Architecture review gates before implementation",
    "Traceability from strategy to requirement",
    "Risk and compliance review integration",
    "Data quality validation and testing",
    "Final stakeholder approval workflows"
  ];

  const researchDeliverables = [
    "Industry baseline assessment",
    "Task analysis documentation",
    "Product discovery lifecycle analysis",
    "Software lifecycle management analysis",
    "Gap analysis report",
    "Human-AI governance assessment",
    "Final research paper"
  ];

  const architectureDeliverables = [
    "Conceptual architecture framework",
    "AI integration capability model",
    "Product discovery workflow diagrams",
    "UML activity/use case diagrams",
    "Strategic initiative traceability model",
    "Governance process flows",
    "Lifecycle transformation diagrams"
  ];

  const problemCards = [
    {
      title: "Misalignment between executive intent and implementation execution",
      icon: Target
    },
    {
      title: "Delays in product discovery and requirements analysis",
      icon: AlertCircle
    },
    {
      title: "Fragmented communication between business and technical stakeholders",
      icon: Users
    },
    {
      title: "Limited decision traceability across lifecycle phases",
      icon: GitBranch
    }
  ];

  const componentGroups = [
    {
      name: "Navigation and commands",
      count: 10,
      icon: PanelTop,
      examples: ["Button", "Navigation Menu", "Dropdown Menu", "Tabs", "Breadcrumb"]
    },
    {
      name: "Data and status",
      count: 9,
      icon: Gauge,
      examples: ["Badge", "Progress", "Table", "Chart", "Skeleton"]
    },
    {
      name: "Forms and input",
      count: 11,
      icon: ListChecks,
      examples: ["Input", "Textarea", "Select", "Checkbox", "Radio Group"]
    },
    {
      name: "Panels and overlays",
      count: 15,
      icon: Layers,
      examples: ["Card", "Dialog", "Sheet", "Drawer", "Accordion"]
    }
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation - Retro HUD Style */}
      <nav className="sticky top-0 z-50 bg-black border-b-2 border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 relative">
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400"></div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4 mr-6 text-sm text-cyan-400 retro-heading">
              <button onClick={() => scrollToSection('overview')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Overview</button>
              <button onClick={() => scrollToSection('framework')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Framework</button>
              <button onClick={() => scrollToSection('ai-augmentation')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">AI Powers</button>
              <button onClick={() => scrollToSection('use-cases')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Missions</button>
              <button onClick={() => scrollToSection('governance')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Governance</button>
              <button onClick={() => scrollToSection('ui-components')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Components</button>
              <button onClick={() => scrollToSection('deliverables')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Deliverables</button>
              <button onClick={() => scrollToSection('team')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Player</button>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-sm retro-heading">
              <button className="px-3 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white border-2 border-fuchsia-400 hover:shadow-[0_0_20px_rgba(236,72,153,0.8)] transition-all flex items-center gap-2">
                <FileText className="w-4 h-4" />
                View Research
              </button>
              <button className="px-3 py-2 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_20px_rgba(0,255,255,0.8)] transition-all flex items-center gap-2">
                <Github className="w-4 h-4" />
                GitHub
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden text-cyan-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 space-y-2 border-t border-cyan-400/30 mt-2 pt-2">
              <button onClick={() => scrollToSection('overview')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Overview</button>
              <button onClick={() => scrollToSection('framework')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Framework</button>
              <button onClick={() => scrollToSection('ai-augmentation')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">AI Powers</button>
              <button onClick={() => scrollToSection('use-cases')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Missions</button>
              <button onClick={() => scrollToSection('governance')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Governance</button>
              <button onClick={() => scrollToSection('ui-components')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Components</button>
              <button onClick={() => scrollToSection('deliverables')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Deliverables</button>
              <button onClick={() => scrollToSection('team')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Player</button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section - Arcade Start Screen */}
      <section className="relative bg-gradient-to-br from-black via-purple-950 to-black py-20 px-4 grid-bg scanlines overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.1)_0%,transparent_70%)]"></div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="mb-4 text-lime-400 retro-heading text-sm tracking-widest animate-pulse">
            [ MISSION START ]
          </div>
          <h1 className="retro-heading text-3xl md:text-4xl lg:text-5xl mb-6 bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,255,255,0.8)]">
            AI-Augmented Framework for Product Discovery and Software Lifecycle Transformation
          </h1>
          <p className="text-lg md:text-xl mb-8 text-cyan-200 max-w-4xl mx-auto leading-relaxed">
            Translating strategic objectives into implementation-ready software outcomes through business architecture, product discovery, conceptual architecture, AI augmentation, and governance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => scrollToSection('framework')}
              className="retro-heading px-8 py-4 bg-gradient-to-r from-lime-500 to-emerald-500 text-black border-4 border-lime-400 hover:shadow-[0_0_30px_rgba(0,255,0,0.8)] hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              ▶ START MISSION
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollToSection('deliverables')}
              className="retro-heading px-8 py-4 border-4 border-fuchsia-500 text-fuchsia-400 hover:bg-fuchsia-500 hover:text-black hover:shadow-[0_0_30px_rgba(236,72,153,0.8)] hover:scale-105 transition-all"
            >
              VIEW ARTIFACTS
            </button>
          </div>

          {/* Game Progress Flow */}
          <div className="bg-black/60 border-2 border-cyan-500 shadow-[0_0_20px_rgba(0,255,255,0.5)] p-6 max-w-5xl mx-auto">
            <div className="text-cyan-400 retro-heading text-xs mb-3">MISSION PROGRESSION</div>
            <div className="flex flex-wrap justify-center items-center gap-2 text-xs md:text-sm">
              <div className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400 text-white">LVL 1: Strategy</div>
              <ChevronRight className="w-3 h-3 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400 text-white">LVL 2: Business Arch</div>
              <ChevronRight className="w-3 h-3 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400 text-white">LVL 3: Discovery</div>
              <ChevronRight className="w-3 h-3 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400 text-white">LVL 4: Architecture</div>
              <ChevronRight className="w-3 h-3 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400 text-white">LVL 5: Lifecycle</div>
              <ChevronRight className="w-3 h-3 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 border border-fuchsia-400 text-white font-bold">BOSS: Value</div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Problem Section - Retro Alert Screen */}
      <section id="overview" className="py-16 px-4 bg-gradient-to-b from-gray-950 to-black relative">
        <div className="absolute inset-0 grid-bg opacity-20"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-red-500 bg-red-500/20 text-red-400 retro-heading text-xs mb-4 animate-pulse">
              ⚠ CRITICAL CHALLENGES DETECTED ⚠
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-4 text-center bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            The Strategy-to-Implementation Gap
          </h2>
          <p className="text-lg text-cyan-200 mb-12 max-w-4xl mx-auto text-center leading-relaxed">
            Many enterprise transformation efforts fail not because technology is unavailable, but because organizations lack a structured way to translate strategic intent into operational design, validated product direction, and implementation-ready technical outcomes.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {problemCards.map((problem, index) => {
              const Icon = problem.icon;
              return (
                <div key={index} className="bg-black p-6 border-2 border-orange-500 shadow-[0_0_15px_rgba(255,165,0,0.5)] hover:shadow-[0_0_25px_rgba(255,165,0,0.8)] hover:border-red-500 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-red-600 to-orange-600 border-2 border-orange-400 group-hover:shadow-[0_0_15px_rgba(255,165,0,0.8)]">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-orange-200 flex-1 leading-relaxed">{problem.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Framework Flow Section - Level Select */}
      <section id="framework" className="py-16 px-4 bg-black relative scanlines">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 to-black"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-cyan-400 bg-cyan-400/10 text-cyan-400 retro-heading text-xs mb-4">
              SELECT STAGE
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-8 text-center bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Framework Lifecycle Map
          </h2>
          <p className="text-center text-purple-300 mb-12 max-w-3xl mx-auto">
            Click on any stage to explore its purpose, key questions, AI augmentation opportunities, and governance checkpoints.
          </p>

          {/* Desktop: Horizontal scrollable flow */}
          <div className="hidden lg:block overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max px-4">
              {frameworkStages.map((stage, index) => (
                <div key={stage.id} className="flex items-center">
                  <button
                    onClick={() => setSelectedStage(stage.id)}
                    className={`w-64 p-6 border-4 transition-all retro-heading text-sm relative group ${
                      selectedStage === stage.id
                        ? 'border-lime-400 bg-gradient-to-br from-lime-600 to-green-600 text-black shadow-[0_0_30px_rgba(0,255,0,0.8)]'
                        : 'border-purple-500 bg-gradient-to-br from-purple-900 to-black text-purple-300 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,255,255,0.6)]'
                    }`}
                  >
                    <div className={`text-xs mb-2 ${selectedStage === stage.id ? 'text-green-900' : 'text-fuchsia-400'}`}>STAGE {stage.id}</div>
                    <div className={`text-sm leading-tight ${selectedStage === stage.id ? 'text-black' : 'text-cyan-300'}`}>{stage.title}</div>
                    {selectedStage === stage.id && (
                      <div className="absolute top-2 right-2 text-xs text-green-900">▶ ACTIVE</div>
                    )}
                  </button>
                  {index < frameworkStages.length - 1 && (
                    <ChevronRight className="w-8 h-8 text-cyan-500 mx-2 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile/Tablet: Vertical list */}
          <div className="lg:hidden space-y-4">
            {frameworkStages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
                className={`w-full p-6 border-4 transition-all text-left retro-heading relative ${
                  selectedStage === stage.id
                    ? 'border-lime-400 bg-gradient-to-br from-lime-600 to-green-600 text-black shadow-[0_0_30px_rgba(0,255,0,0.8)]'
                    : 'border-purple-500 bg-gradient-to-br from-purple-900 to-black text-purple-300 hover:border-cyan-400'
                }`}
              >
                <div className={`text-xs mb-2 ${selectedStage === stage.id ? 'text-green-900' : 'text-fuchsia-400'}`}>STAGE {stage.id}</div>
                <div className={`text-base ${selectedStage === stage.id ? 'text-black' : 'text-cyan-300'}`}>{stage.title}</div>
                {selectedStage === stage.id && (
                  <div className="absolute top-4 right-4 text-xs text-green-900">▶</div>
                )}
              </button>
            ))}
          </div>

          {/* Detail Panel - Mission Briefing */}
          {selectedStage && (
            <div className="mt-8 bg-black p-8 border-4 border-lime-400 shadow-[0_0_40px_rgba(0,255,0,0.6)] relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-cyan-400"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-cyan-400"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-cyan-400"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-cyan-400"></div>

              {frameworkStages.map((stage) => {
                if (stage.id === selectedStage) {
                  return (
                    <div key={stage.id}>
                      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                        <div>
                          <div className="text-lime-400 retro-heading text-xs mb-1">[ MISSION BRIEFING ]</div>
                          <h3 className="retro-heading text-2xl text-cyan-400">{stage.title}</h3>
                        </div>
                        <span className="px-4 py-2 bg-gradient-to-r from-lime-500 to-green-500 text-black border-2 border-lime-400 retro-heading text-sm">
                          STAGE {stage.id}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                          <div className="border-l-4 border-cyan-400 pl-4">
                            <h4 className="retro-heading text-cyan-400 mb-2 flex items-center gap-2 text-sm">
                              <Target className="w-5 h-5" />
                              OBJECTIVE
                            </h4>
                            <p className="text-purple-200 leading-relaxed">{stage.purpose}</p>
                          </div>

                          <div className="border-l-4 border-fuchsia-400 pl-4">
                            <h4 className="retro-heading text-fuchsia-400 mb-2 flex items-center gap-2 text-sm">
                              <AlertCircle className="w-5 h-5" />
                              KEY QUESTIONS
                            </h4>
                            <ul className="space-y-2">
                              {stage.keyQuestions.map((question, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-purple-200">
                                  <span className="text-lime-400 flex-shrink-0">▸</span>
                                  {question}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="border-l-4 border-lime-400 pl-4">
                            <h4 className="retro-heading text-lime-400 mb-2 flex items-center gap-2 text-sm">
                              <Lightbulb className="w-5 h-5" />
                              AI POWER-UP
                            </h4>
                            <p className="text-purple-200 leading-relaxed">{stage.aiOpportunity}</p>
                          </div>

                          <div className="border-l-4 border-purple-400 pl-4">
                            <h4 className="retro-heading text-purple-400 mb-2 flex items-center gap-2 text-sm">
                              <FileText className="w-5 h-5" />
                              ARTIFACT
                            </h4>
                            <p className="text-purple-200 leading-relaxed">{stage.artifact}</p>
                          </div>

                          <div className="border-l-4 border-orange-400 pl-4">
                            <h4 className="retro-heading text-orange-400 mb-2 flex items-center gap-2 text-sm">
                              <Shield className="w-5 h-5" />
                              CHECKPOINT
                            </h4>
                            <p className="text-purple-200 leading-relaxed">{stage.governance}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </section>

      {/* AI Augmentation Layer - Power-Ups */}
      <section id="ai-augmentation" className="py-16 px-4 bg-gradient-to-b from-black via-purple-950 to-black relative grid-bg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,255,0.1)_0%,transparent_70%)]"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-fuchsia-400 bg-fuchsia-400/10 text-fuchsia-400 retro-heading text-xs mb-4 animate-pulse">
              ⚡ AI POWER-UPS AVAILABLE ⚡
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-4 text-center bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            AI Support Systems
          </h2>
          <p className="text-center text-purple-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            AI augments research, analysis, and workflow acceleration throughout the framework, while human experts retain responsibility for validation and decision-making.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiAugmentationCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={index} className="bg-gradient-to-br from-purple-900 to-black p-6 border-2 border-fuchsia-500 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(0,255,255,0.6)] transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-gradient-to-br from-fuchsia-600 to-purple-600 border-2 border-fuchsia-400 group-hover:shadow-[0_0_15px_rgba(236,72,153,0.8)]">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-cyan-300 text-sm">{card.title}</h3>
                  </div>
                  <div className="inline-block px-3 py-1 bg-yellow-400/20 border border-yellow-400 text-yellow-300 text-xs retro-heading">
                    HUMAN OVERSIGHT
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Business Architecture Bridge - Quest Chain */}
      <section className="py-16 px-4 bg-black relative">
        <div className="absolute inset-0 grid-bg opacity-30"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-cyan-400 bg-cyan-400/10 text-cyan-400 retro-heading text-xs mb-4">
              QUEST CHAIN
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-8 text-center bg-gradient-to-r from-cyan-400 to-lime-400 bg-clip-text text-transparent">
            From Strategy to Implementation
          </h2>

          <div className="bg-black border-4 border-cyan-500 shadow-[0_0_30px_rgba(0,255,255,0.5)] p-8 mb-8">
            <div className="flex flex-wrap justify-center items-center gap-3 text-xs md:text-sm retro-heading">
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Executive Strategy</div>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Capabilities</div>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Value Streams</div>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Activities</div>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Personas</div>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Processes</div>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Info Concepts</div>
              <ChevronRight className="w-4 h-4 text-lime-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-lime-500 to-green-500 border-2 border-lime-400 text-black font-bold">Architecture</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-900/40 to-black border-l-4 border-cyan-400 p-6">
            <p className="text-purple-200 text-lg leading-relaxed">
              <strong className="text-cyan-400">Business architecture</strong> identifies where value should be created.
              <strong className="text-lime-400"> Product discovery</strong> validates what problem should be solved.
              <strong className="text-fuchsia-400"> Conceptual architecture</strong> defines the high-level solution structure needed to support implementation readiness.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases - Boss Missions */}
      <section id="use-cases" className="py-16 px-4 bg-gradient-to-b from-gray-950 to-black relative scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,0,0.1)_0%,transparent_70%)]"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-lime-400 bg-lime-400/10 text-lime-400 retro-heading text-xs mb-4 animate-pulse">
              🎯 ENTERPRISE MISSIONS 🎯
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-12 text-center bg-gradient-to-r from-lime-400 to-green-400 bg-clip-text text-transparent">
            Real-World Scenarios
          </h2>

          <div className="grid lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="bg-black border-4 border-lime-500 shadow-[0_0_20px_rgba(0,255,0,0.5)] hover:shadow-[0_0_35px_rgba(0,255,0,0.8)] transition-all overflow-hidden group">
                <div className="bg-gradient-to-r from-lime-600 to-green-600 text-black p-6 border-b-4 border-lime-400">
                  <div className="retro-heading text-xs mb-2">MISSION {index + 1}</div>
                  <h3 className="retro-heading text-base">{useCase.name}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="border-l-2 border-cyan-400 pl-3">
                    <h4 className="retro-heading text-cyan-400 mb-1 text-xs">OBJECTIVE</h4>
                    <p className="text-purple-200 text-sm leading-relaxed">{useCase.goal}</p>
                  </div>
                  <div className="border-l-2 border-fuchsia-400 pl-3">
                    <h4 className="retro-heading text-fuchsia-400 mb-1 text-xs">VALUE TYPE</h4>
                    <p className="text-purple-200 text-sm">{useCase.valueType}</p>
                  </div>
                  <div className="border-l-2 border-purple-400 pl-3">
                    <h4 className="retro-heading text-purple-400 mb-1 text-xs">BA FOCUS</h4>
                    <p className="text-purple-200 text-sm">{useCase.baFocus}</p>
                  </div>
                  <div className="border-l-2 border-yellow-400 pl-3">
                    <h4 className="retro-heading text-yellow-400 mb-1 text-xs">AI OPPORTUNITY</h4>
                    <p className="text-purple-200 text-sm">{useCase.aiOpportunity}</p>
                  </div>
                  <div className="border-l-2 border-orange-400 pl-3">
                    <h4 className="retro-heading text-orange-400 mb-1 text-xs">ARCHITECTURE</h4>
                    <p className="text-purple-200 text-sm">{useCase.conceptualOutput}</p>
                  </div>
                  <div className="pt-4 border-t-2 border-lime-500 bg-lime-400/10 -mx-6 -mb-6 px-6 pb-6 mt-6">
                    <h4 className="retro-heading text-lime-400 mb-1 text-xs">MEASURABLE VALUE</h4>
                    <p className="text-lime-300 text-sm font-bold">{useCase.metrics}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Governance - Security Protocols */}
      <section id="governance" className="py-16 px-4 bg-black relative">
        <div className="absolute inset-0 grid-bg opacity-20"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-orange-400 bg-orange-400/10 text-orange-400 retro-heading text-xs mb-4 animate-pulse">
              🛡️ SECURITY PROTOCOL ACTIVE 🛡️
            </div>
          </div>
          <h2 className="retro-heading text-2xl md:text-3xl mb-8 text-center bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Governance Preserves Trust and Integrity
          </h2>

          <div className="bg-black border-4 border-yellow-500 shadow-[0_0_30px_rgba(255,255,0,0.5)] p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1 animate-pulse" />
              <p className="text-yellow-200 leading-relaxed">
                <strong className="text-yellow-400 retro-heading text-sm">CRITICAL NOTICE:</strong> AI should augment research, analysis, and workflow acceleration, but human experts remain responsible for validation, judgment, and final decision-making.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {governanceControls.map((control, index) => (
              <div key={index} className="flex items-start gap-3 bg-gradient-to-r from-purple-900/40 to-black p-4 border-2 border-cyan-500 hover:border-lime-400 hover:shadow-[0_0_15px_rgba(0,255,0,0.5)] transition-all">
                <Check className="w-5 h-5 text-lime-400 flex-shrink-0 mt-0.5" />
                <span className="text-purple-200 text-sm leading-relaxed">{control}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UI Component System - Built Component Inventory */}
      <section id="ui-components" className="py-16 px-4 bg-gradient-to-b from-black via-slate-950 to-black relative">
        <div className="absolute inset-0 grid-bg opacity-20"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-cyan-400 bg-cyan-400/10 text-cyan-400 retro-heading text-xs mb-4">
              COMPONENT SYSTEM ONLINE
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-4 text-center bg-gradient-to-r from-cyan-400 to-lime-400 bg-clip-text text-transparent">
            Built UI Components
          </h2>
          <p className="text-center text-purple-200 mb-10 max-w-3xl mx-auto leading-relaxed">
            The public build now surfaces the reusable UI component layer included in the project: cards, buttons, tabs, accordions, badges, progress indicators, form controls, overlays, and navigation primitives.
          </p>

          <Tabs defaultValue="inventory" className="w-full">
            <TabsList className="mx-auto mb-8 bg-black border-2 border-cyan-500 rounded-md p-1 h-auto flex-wrap">
              <TabsTrigger value="inventory" className="rounded-sm data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-cyan-300 px-4 py-2">Inventory</TabsTrigger>
              <TabsTrigger value="patterns" className="rounded-sm data-[state=active]:bg-lime-500 data-[state=active]:text-black text-lime-300 px-4 py-2">Patterns</TabsTrigger>
              <TabsTrigger value="readiness" className="rounded-sm data-[state=active]:bg-fuchsia-500 data-[state=active]:text-black text-fuchsia-300 px-4 py-2">Readiness</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                {componentGroups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <Card key={group.name} className="bg-black/90 border-2 border-cyan-500 rounded-md shadow-[0_0_18px_rgba(0,255,255,0.25)]">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="p-2 border-2 border-lime-400 bg-lime-400/10">
                            <Icon className="w-5 h-5 text-lime-400" />
                          </div>
                          <Badge className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">{group.count} built</Badge>
                        </div>
                        <CardTitle className="retro-heading text-sm text-cyan-300">{group.name}</CardTitle>
                        <CardDescription className="text-purple-300">Reusable primitives available in `src/app/components/ui`.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {group.examples.map((example) => (
                            <Badge key={example} variant="outline" className="rounded-sm border-purple-400 text-purple-200">
                              {example}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="patterns">
              <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
                <Card className="bg-black/90 border-2 border-lime-500 rounded-md">
                  <CardHeader>
                    <CardTitle className="retro-heading text-lime-400">Interactive Pattern Library</CardTitle>
                    <CardDescription className="text-purple-300">Sample combinations used by the research website.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <Button className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Primary action</Button>
                      <Button variant="outline" className="rounded-sm border-cyan-400 text-cyan-300 bg-black hover:bg-cyan-400 hover:text-black">Secondary action</Button>
                      <Button variant="ghost" className="rounded-sm text-fuchsia-300 hover:bg-fuchsia-400/20 hover:text-fuchsia-100">Quiet action</Button>
                    </div>
                    <Separator className="bg-cyan-500/40" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-cyan-300">Lifecycle UI coverage</span>
                        <span className="text-lime-400 retro-heading text-xs">82%</span>
                      </div>
                      <Progress value={82} className="h-3 bg-cyan-950 [&>div]:bg-lime-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/90 border-2 border-fuchsia-500 rounded-md">
                  <CardHeader>
                    <CardTitle className="retro-heading text-fuchsia-400">Component Usage Notes</CardTitle>
                    <CardDescription className="text-purple-300">How the current UI kit supports the public framework page.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="text-purple-200">
                      <AccordionItem value="layout" className="border-cyan-500/40">
                        <AccordionTrigger className="text-cyan-300 hover:text-cyan-100">Layout surfaces</AccordionTrigger>
                        <AccordionContent className="text-purple-200">Cards, tabs, separators, and panels provide the structure for framework stages, deliverables, and review checkpoints.</AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="workflow" className="border-cyan-500/40">
                        <AccordionTrigger className="text-cyan-300 hover:text-cyan-100">Workflow controls</AccordionTrigger>
                        <AccordionContent className="text-purple-200">Buttons, badges, progress, accordions, and tabs support exploration, state signaling, and compact disclosure.</AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="future" className="border-cyan-500/40">
                        <AccordionTrigger className="text-cyan-300 hover:text-cyan-100">Future expansion</AccordionTrigger>
                        <AccordionContent className="text-purple-200">Dialog, sheet, form, table, chart, command, and calendar components are ready for later research artifacts and project workflows.</AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="readiness">
              <Card className="bg-black/90 border-2 border-purple-500 rounded-md">
                <CardHeader>
                  <CardTitle className="retro-heading text-purple-300">Public Link Readiness</CardTitle>
                  <CardDescription className="text-purple-300">What is included in the deployed artifact.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {["Framework page", "Component showcase", "CI/CD publishing"].map((item) => (
                      <div key={item} className="flex items-center gap-3 border-2 border-lime-500/70 bg-lime-400/10 p-4">
                        <Check className="w-5 h-5 text-lime-400 flex-shrink-0" />
                        <span className="text-purple-100">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Deliverables - Item Inventory */}
      <section id="deliverables" className="py-16 px-4 bg-gradient-to-b from-purple-950 to-black relative scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.1)_0%,transparent_70%)]"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-fuchsia-400 bg-fuchsia-400/10 text-fuchsia-400 retro-heading text-xs mb-4">
              📦 MISSION ARTIFACTS 📦
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-12 text-center bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
            Project Deliverables
          </h2>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3 className="retro-heading text-xl text-cyan-400 mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Research Items
              </h3>
              <div className="space-y-3">
                {researchDeliverables.map((item, index) => (
                  <div key={index} className="bg-black p-4 border-2 border-cyan-500 hover:border-lime-400 hover:shadow-[0_0_15px_rgba(0,255,255,0.6)] transition-all group">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-cyan-400 group-hover:text-lime-400" />
                      <span className="text-purple-200 text-sm">{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="retro-heading text-xl text-fuchsia-400 mb-6 flex items-center gap-2">
                <FileCode className="w-6 h-6" />
                Architecture Items
              </h3>
              <div className="space-y-3">
                {architectureDeliverables.map((item, index) => (
                  <div key={index} className="bg-black p-4 border-2 border-fuchsia-500 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(236,72,153,0.6)] transition-all group">
                    <div className="flex items-center gap-3">
                      <GitBranch className="w-5 h-5 text-fuchsia-400 group-hover:text-purple-400" />
                      <span className="text-purple-200 text-sm">{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team - Player Profile */}
      <section id="team" className="py-16 px-4 bg-black relative grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950 to-black opacity-60"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-cyan-400 bg-cyan-400/10 text-cyan-400 retro-heading text-xs mb-4">
              👤 PLAYER PROFILE 👤
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-8 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Project Information
          </h2>

          <div className="bg-black border-4 border-cyan-500 shadow-[0_0_40px_rgba(0,255,255,0.6)] p-8 relative">
            <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-lime-400"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-lime-400"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-lime-400"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-lime-400"></div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="border-l-4 border-cyan-400 pl-4">
                <h3 className="retro-heading text-cyan-400 mb-2 text-sm">Project Lead</h3>
                <p className="text-lg text-purple-200">Tchaas Alexander-Wright</p>
              </div>
              <div className="border-l-4 border-fuchsia-400 pl-4">
                <h3 className="retro-heading text-fuchsia-400 mb-2 text-sm">Team Members</h3>
                <p className="text-lg text-purple-200">N/A</p>
              </div>
              <div className="border-l-4 border-lime-400 pl-4">
                <h3 className="retro-heading text-lime-400 mb-2 text-sm">Program</h3>
                <p className="text-lg text-purple-200">Georgia Tech OMSCS / CS 8903</p>
              </div>
              <div className="border-l-4 border-purple-400 pl-4">
                <h3 className="retro-heading text-purple-400 mb-2 text-sm">Project Type</h3>
                <p className="text-lg text-purple-200">Independent Research Project</p>
              </div>
            </div>

            <div className="pt-8 border-t-2 border-cyan-500 flex flex-col sm:flex-row gap-4">
              <button className="retro-heading flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-black border-4 border-cyan-400 hover:shadow-[0_0_30px_rgba(0,255,255,0.8)] hover:scale-105 transition-all flex items-center justify-center gap-2 text-sm">
                <Github className="w-5 h-5" />
                GitHub Repository
              </button>
              <button className="retro-heading flex-1 px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white border-4 border-fuchsia-400 hover:shadow-[0_0_30px_rgba(236,72,153,0.8)] hover:scale-105 transition-all flex items-center justify-center gap-2 text-sm">
                <FileText className="w-5 h-5" />
                Overleaf Document
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Game Credits */}
      <footer className="bg-black border-t-4 border-cyan-500 py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-8">
            <div className="retro-heading text-xs text-cyan-400 mb-4 animate-pulse">[ MISSION COMPLETE ]</div>
            <h3 className="retro-heading text-xl md:text-2xl mb-2 bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
              AI-Augmented Framework for Product Discovery
            </h3>
            <p className="text-purple-300 text-sm">Georgia Tech CS 8903 Course Project</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mb-8 retro-heading text-xs">
            <button className="text-cyan-400 hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all">Research Paper</button>
            <button className="text-cyan-400 hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all">GitHub</button>
            <button className="text-cyan-400 hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all">Contact</button>
            <button className="text-cyan-400 hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all">References</button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-purple-300 text-xs">Designed with accessibility and performance considerations.</p>
            <p className="text-fuchsia-400 text-sm retro-heading">&copy; 2026 Tchaas Alexander-Wright. All Rights Reserved.</p>
            <div className="pt-4 text-cyan-400 text-xs retro-heading animate-pulse">
              PRESS START TO CONTINUE
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
