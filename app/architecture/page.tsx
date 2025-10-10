'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaHome, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaLightbulb, FaClipboardCheck } from 'react-icons/fa';

export default function ArchitecturePage() {
  const [activeStage, setActiveStage] = useState<number | null>(null);

  const stageGates = [
    {
      stage: 1,
      name: "Discovery & Scoping",
      gate: "Gate 1: Idea Screen",
      color: "blue",
      objectives: [
        "Identify the architectural problem or opportunity",
        "Define initial scope and boundaries",
        "Assess strategic alignment with business goals",
        "Identify key stakeholders"
      ],
      deliverables: [
        "Problem Statement Document",
        "Initial Scope Definition",
        "Stakeholder Map",
        "Business Case (preliminary)"
      ],
      criteria: [
        "Problem is clearly defined and understood",
        "Aligns with organizational strategy",
        "Stakeholders identified and engaged",
        "Initial feasibility confirmed"
      ],
      activities: [
        "Conduct stakeholder interviews",
        "Document current state architecture",
        "Identify pain points and constraints",
        "Define success criteria"
      ]
    },
    {
      stage: 2,
      name: "Analysis & Design",
      gate: "Gate 2: Second Screen",
      color: "indigo",
      objectives: [
        "Analyze architectural requirements in detail",
        "Evaluate multiple solution approaches",
        "Assess technical feasibility and risks",
        "Define architecture principles and patterns"
      ],
      deliverables: [
        "Detailed Requirements Document",
        "Architecture Options Analysis",
        "Risk Assessment Report",
        "Preliminary Architecture Design",
        "Technology Stack Recommendation"
      ],
      criteria: [
        "Requirements are complete and validated",
        "Multiple options evaluated objectively",
        "Risks identified and mitigation planned",
        "Solution approach approved by stakeholders"
      ],
      activities: [
        "Create architecture diagrams (C4 model)",
        "Evaluate technology options",
        "Conduct proof-of-concept if needed",
        "Document non-functional requirements",
        "Assess security and compliance needs"
      ]
    },
    {
      stage: 3,
      name: "Detailed Design & Planning",
      gate: "Gate 3: Go to Development",
      color: "purple",
      objectives: [
        "Create detailed architecture specifications",
        "Define implementation roadmap",
        "Establish quality gates and metrics",
        "Plan resource allocation and timeline"
      ],
      deliverables: [
        "Detailed Architecture Document",
        "Implementation Roadmap",
        "Quality Assurance Plan",
        "Resource Plan and Timeline",
        "Interface Specifications",
        "Data Model and Migration Plan"
      ],
      criteria: [
        "Architecture is fully specified and approved",
        "Implementation plan is realistic and resourced",
        "Quality metrics and gates defined",
        "All dependencies identified and managed"
      ],
      activities: [
        "Create detailed component designs",
        "Define API contracts and interfaces",
        "Plan data migration strategy",
        "Establish monitoring and observability",
        "Define rollback procedures"
      ]
    },
    {
      stage: 4,
      name: "Implementation & Testing",
      gate: "Gate 4: Go to Testing",
      color: "pink",
      objectives: [
        "Implement architecture according to design",
        "Conduct thorough testing at all levels",
        "Validate against requirements",
        "Prepare for deployment"
      ],
      deliverables: [
        "Implemented Solution",
        "Test Results and Coverage Reports",
        "Performance Benchmarks",
        "Security Assessment Results",
        "Deployment Documentation",
        "Operations Runbooks"
      ],
      criteria: [
        "All components implemented and integrated",
        "Test coverage meets quality gates",
        "Performance meets requirements",
        "Security vulnerabilities addressed",
        "Documentation complete"
      ],
      activities: [
        "Develop according to architecture",
        "Conduct unit, integration, and system testing",
        "Perform load and stress testing",
        "Execute security testing",
        "Create operational documentation"
      ]
    },
    {
      stage: 5,
      name: "Deployment & Launch",
      gate: "Gate 5: Go to Launch",
      color: "green",
      objectives: [
        "Deploy solution to production",
        "Monitor and validate in production",
        "Train users and operations teams",
        "Establish support processes"
      ],
      deliverables: [
        "Production Deployment",
        "Deployment Report",
        "Training Materials",
        "Support Documentation",
        "Monitoring Dashboards",
        "Incident Response Procedures"
      ],
      criteria: [
        "Deployment successful with no critical issues",
        "Monitoring shows healthy system state",
        "Users and operations trained",
        "Support processes in place"
      ],
      activities: [
        "Execute deployment plan",
        "Monitor system health and performance",
        "Conduct user training sessions",
        "Establish support channels",
        "Document lessons learned"
      ]
    },
    {
      stage: 6,
      name: "Review & Optimization",
      gate: "Post-Launch Review",
      color: "teal",
      objectives: [
        "Evaluate solution against success criteria",
        "Identify optimization opportunities",
        "Capture lessons learned",
        "Plan continuous improvement"
      ],
      deliverables: [
        "Post-Implementation Review Report",
        "Performance Analysis",
        "Lessons Learned Document",
        "Optimization Backlog",
        "Architecture Decision Records (ADRs)"
      ],
      criteria: [
        "Success criteria met or exceeded",
        "System stable and performing well",
        "Stakeholders satisfied",
        "Lessons learned documented"
      ],
      activities: [
        "Conduct retrospective meetings",
        "Analyze production metrics",
        "Gather user feedback",
        "Update architecture documentation",
        "Plan next iteration or enhancements"
      ]
    }
  ];

  const bestPractices = [
    {
      title: "Document Architecture Decisions",
      description: "Use Architecture Decision Records (ADRs) to document why decisions were made, not just what was decided.",
      icon: FaClipboardCheck
    },
    {
      title: "Involve Stakeholders Early",
      description: "Engage business, technical, and operational stakeholders from the discovery phase onwards.",
      icon: FaLightbulb
    },
    {
      title: "Validate Assumptions",
      description: "Test critical assumptions through proof-of-concepts before committing to full implementation.",
      icon: FaExclamationTriangle
    },
    {
      title: "Plan for Failure",
      description: "Design for resilience, implement monitoring, and have rollback procedures ready.",
      icon: FaCheckCircle
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; hover: string }> = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:bg-blue-100' },
      indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', hover: 'hover:bg-indigo-100' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', hover: 'hover:bg-purple-100' },
      pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', hover: 'hover:bg-pink-100' },
      green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', hover: 'hover:bg-green-100' },
      teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', hover: 'hover:bg-teal-100' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <FaHome className="mr-2" />
            Back to Home
          </Link>
          
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-blue-600">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Architectural Problem-Solving Framework
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              A Stage-Gate Approach for Martin Meester and the Architecture Team
            </p>
            <p className="text-sm text-gray-500">
              This framework ensures systematic, quality-driven architectural decision-making through structured gates and clear deliverables.
            </p>
          </div>
        </div>

        {/* Stage-Gate Overview */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Stage-Gate Process Overview</h2>
          <p className="text-gray-600 mb-6">
            The Stage-Gate process divides architectural work into distinct stages, each ending with a gate review. 
            Gates serve as quality checkpoints where the project is evaluated before proceeding to the next stage.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {stageGates.map((stage) => {
              const colors = getColorClasses(stage.color);
              return (
                <button
                  key={stage.stage}
                  onClick={() => setActiveStage(activeStage === stage.stage ? null : stage.stage)}
                  className={`px-4 py-2 rounded-lg border-2 ${colors.border} ${colors.bg} ${colors.text} ${colors.hover} transition-all font-medium`}
                >
                  Stage {stage.stage}: {stage.name}
                </button>
              );
            })}
          </div>

          {/* Stage Details */}
          {activeStage && (
            <div className="mt-6 animate-fadeIn">
              {stageGates.filter(s => s.stage === activeStage).map((stage) => {
                const colors = getColorClasses(stage.color);
                return (
                  <div key={stage.stage} className={`border-2 ${colors.border} rounded-lg p-6 ${colors.bg}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-2xl font-bold ${colors.text}`}>
                        Stage {stage.stage}: {stage.name}
                      </h3>
                      <span className={`px-4 py-2 rounded-full ${colors.bg} ${colors.text} font-semibold border ${colors.border}`}>
                        {stage.gate}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Objectives */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                          <FaLightbulb className="mr-2 text-yellow-500" />
                          Objectives
                        </h4>
                        <ul className="space-y-2">
                          {stage.objectives.map((obj, idx) => (
                            <li key={idx} className="flex items-start text-sm text-gray-700">
                              <span className="text-green-500 mr-2">•</span>
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Deliverables */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                          <FaClipboardCheck className="mr-2 text-blue-500" />
                          Deliverables
                        </h4>
                        <ul className="space-y-2">
                          {stage.deliverables.map((del, idx) => (
                            <li key={idx} className="flex items-start text-sm text-gray-700">
                              <span className="text-blue-500 mr-2">•</span>
                              {del}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Gate Criteria */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                          <FaCheckCircle className="mr-2 text-green-500" />
                          Gate Criteria
                        </h4>
                        <ul className="space-y-2">
                          {stage.criteria.map((crit, idx) => (
                            <li key={idx} className="flex items-start text-sm text-gray-700">
                              <span className="text-green-500 mr-2">✓</span>
                              {crit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Activities */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                          <FaExclamationTriangle className="mr-2 text-orange-500" />
                          Key Activities
                        </h4>
                        <ul className="space-y-2">
                          {stage.activities.map((act, idx) => (
                            <li key={idx} className="flex items-start text-sm text-gray-700">
                              <span className="text-orange-500 mr-2">→</span>
                              {act}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Best Practices */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Architecture Best Practices</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {bestPractices.map((practice, idx) => (
              <div key={idx} className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-400 transition-colors">
                <div className="flex items-start">
                  <practice.icon className="text-3xl text-blue-600 mr-4 mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">{practice.title}</h3>
                    <p className="text-sm text-gray-600">{practice.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decision Framework */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Architectural Decision Framework</h2>
          
          <div className="space-y-6">
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-bold text-gray-900 mb-2 flex items-center">
                <FaCheckCircle className="text-green-500 mr-2" />
                When to Proceed (Go Decision)
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All gate criteria met</li>
                <li>• Stakeholder alignment achieved</li>
                <li>• Resources available and committed</li>
                <li>• Risks identified and acceptable</li>
                <li>• Clear path to next gate</li>
              </ul>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="font-bold text-gray-900 mb-2 flex items-center">
                <FaExclamationTriangle className="text-yellow-500 mr-2" />
                When to Pause (Conditional Go)
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Minor criteria not met, but addressable</li>
                <li>• Additional information needed</li>
                <li>• Dependencies need resolution</li>
                <li>• Resource constraints require adjustment</li>
                <li>• Proceed with specific conditions</li>
              </ul>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="font-bold text-gray-900 mb-2 flex items-center">
                <FaTimesCircle className="text-red-500 mr-2" />
                When to Stop (Kill Decision)
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Critical gate criteria cannot be met</li>
                <li>• Strategic misalignment discovered</li>
                <li>• Technical feasibility disproven</li>
                <li>• Cost-benefit no longer favorable</li>
                <li>• Better alternative identified</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Templates & Tools */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Templates & Tools</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border-2 border-blue-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
              <h3 className="font-bold text-gray-900 mb-2">ADR Template</h3>
              <p className="text-sm text-gray-600 mb-3">Architecture Decision Record template for documenting decisions</p>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Download Template →
              </button>
            </div>
            <div className="border-2 border-blue-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
              <h3 className="font-bold text-gray-900 mb-2">Gate Review Checklist</h3>
              <p className="text-sm text-gray-600 mb-3">Comprehensive checklist for each stage gate review</p>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Download Checklist →
              </button>
            </div>
            <div className="border-2 border-blue-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
              <h3 className="font-bold text-gray-900 mb-2">Risk Assessment Matrix</h3>
              <p className="text-sm text-gray-600 mb-3">Template for identifying and assessing architectural risks</p>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Download Matrix →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
