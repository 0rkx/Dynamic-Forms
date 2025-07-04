import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.6, 
      staggerChildren: 0.1 
    } 
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const FeaturesPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Hero Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4">
          Powerful Features That
          <br />
          <span className="text-neutral-700">Transform Forms</span>
        </h1>
        <p className="max-w-3xl mx-auto text-lg md:text-xl text-neutral-600 mb-8">
          Discover how AI-powered intelligence makes form creation effortless and form responses more insightful than ever before.
        </p>
      </motion.div>

      {/* AI Brain Feature - Hero Feature */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mb-20"
      >
        <Card className="p-8 md:p-12 bg-gradient-to-br from-neutral-50 to-neutral-100 border-2 border-neutral-200">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Featured
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-4 text-neutral-900">
                🧠 AI Conversation Brain
              </h2>
              <p className="text-lg text-neutral-600 mb-6">
                Transform static forms into intelligent conversations. Our AI analyzes responses in real-time and generates contextual follow-up questions, creating a natural dialogue that gathers richer, more meaningful data.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-neutral-700">Intelligent response analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-neutral-700">Dynamic question generation</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-neutral-700">Adaptive conversation flow</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
              <div className="space-y-4">
                {/* Form Header */}
                <div className="border-b border-neutral-200 pb-4">
                  <h4 className="text-lg font-semibold text-neutral-900 mb-1">Customer Feedback Survey</h4>
                  <p className="text-sm text-neutral-600">Help us improve your experience</p>
                </div>
                
                {/* Question 1 - Completed */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 mb-1">What's your main goal for this feedback?</p>
                      <p className="text-sm text-green-700 bg-green-100 px-3 py-1 rounded">Improve customer satisfaction</p>
                    </div>
                  </div>
                </div>

                {/* AI Follow-up Question - Current */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">AI</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-3">I see you want to improve customer satisfaction. What specific aspect would you like to focus on?</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button className="bg-white border border-blue-300 text-blue-800 px-3 py-2 rounded text-xs font-medium hover:bg-blue-50">Response Time</button>
                        <button className="bg-white border border-blue-300 text-blue-800 px-3 py-2 rounded text-xs font-medium hover:bg-blue-50">Support Quality</button>
                        <button className="bg-white border border-blue-300 text-blue-800 px-3 py-2 rounded text-xs font-medium hover:bg-blue-50">Product Features</button>
                        <button className="bg-white border border-blue-300 text-blue-800 px-3 py-2 rounded text-xs font-medium hover:bg-blue-50">Pricing</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-2 pt-2">
                  <div className="flex-1 bg-neutral-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '33%' }}></div>
                  </div>
                  <span className="text-xs text-neutral-600">Step 2 of 6</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Main Features Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
      >
        {/* Natural Language Generation */}
        <motion.div variants={cardVariants}>
          <Card className="p-6 h-full hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900">Natural Language Generation</h3>
            <p className="text-neutral-600 mb-4">
              Simply describe your form in plain English. Our AI understands context and creates complete forms with appropriate question types and logic.
            </p>
            <div className="text-sm text-neutral-500">
              "Create a customer feedback survey about our mobile app"
            </div>
          </Card>
        </motion.div>

        {/* Context-Aware Analysis */}
        <motion.div variants={cardVariants}>
          <Card className="p-6 h-full hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900">Context-Aware Analysis</h3>
            <p className="text-neutral-600 mb-4">
              Get intelligent insights from responses. Our AI analyzes patterns, sentiment, and context to provide actionable recommendations.
            </p>
            <div className="text-sm text-neutral-500">
              Understand what your data really means
            </div>
          </Card>
        </motion.div>

        {/* Smart Question Flow */}
        <motion.div variants={cardVariants}>
          <Card className="p-6 h-full hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900">Smart Question Flow</h3>
            <p className="text-neutral-600 mb-4">
              Dynamic conditional logic that adapts based on responses. Show relevant questions and skip irrelevant ones automatically.
            </p>
            <div className="text-sm text-neutral-500">
              Personalized experience for every user
            </div>
          </Card>
        </motion.div>

        {/* Real-time Analytics */}
        <motion.div variants={cardVariants}>
          <Card className="p-6 h-full hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900">Real-time Analytics</h3>
            <p className="text-neutral-600 mb-4">
              Track form performance, completion rates, and response patterns as they happen. Beautiful charts and insights at your fingertips.
            </p>
            <div className="text-sm text-neutral-500">
              Data-driven form optimization
            </div>
          </Card>
        </motion.div>

        {/* Export & Integration */}
        <motion.div variants={cardVariants}>
          <Card className="p-6 h-full hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900">Export & Integration</h3>
            <p className="text-neutral-600 mb-4">
              Export to CSV, JSON, or directly to Google Sheets. Seamlessly integrate with your existing workflows and tools.
            </p>
            <div className="text-sm text-neutral-500">
              Your data, wherever you need it
            </div>
          </Card>
        </motion.div>

        {/* Zero-Code Solution */}
        <motion.div variants={cardVariants}>
          <Card className="p-6 h-full hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900">Zero-Code Solution</h3>
            <p className="text-neutral-600 mb-4">
              No technical skills required. Create sophisticated forms with branching logic, validation, and beautiful designs in minutes.
            </p>
            <div className="text-sm text-neutral-500">
              Powerful forms for everyone
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Data Visualization & Analytics Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mb-20"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-4 text-neutral-900">
            Turn Data Into Insights
          </h2>
          <p className="max-w-3xl mx-auto text-lg text-neutral-600">
            Don't just collect responses - understand them. Our AI-powered analytics transforms thousands of responses into clear, actionable insights.
          </p>
        </div>

        {/* Visual Analytics Dashboard Preview */}
        <Card className="p-8 md:p-12 mb-12">
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <h3 className="text-2xl font-bold mb-4 text-indigo-900">📈 Visual Analytics Dashboard</h3>
              <p className="text-indigo-800 mb-6">
                Transform overwhelming spreadsheets into beautiful, interactive charts and graphs. See patterns emerge from your data with our intelligent visualization engine.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border border-indigo-200">
                  <div className="text-sm font-medium text-indigo-600 mb-2">Response Trends</div>
                  <div className="flex items-end gap-1 h-12">
                    <div className="bg-indigo-200 w-3 h-6 rounded-sm"></div>
                    <div className="bg-indigo-300 w-3 h-8 rounded-sm"></div>
                    <div className="bg-indigo-400 w-3 h-12 rounded-sm"></div>
                    <div className="bg-indigo-500 w-3 h-10 rounded-sm"></div>
                    <div className="bg-indigo-600 w-3 h-7 rounded-sm"></div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-indigo-200">
                  <div className="text-sm font-medium text-indigo-600 mb-2">Completion Rate</div>
                  <div className="flex items-center justify-center h-12">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 bg-indigo-100 rounded-full"></div>
                      <div className="absolute inset-2 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">87%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-indigo-200 shadow-sm">
                <div className="text-sm font-medium text-indigo-600 mb-3">Key Insights</div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="text-sm text-neutral-700">
                      <strong>Peak response time:</strong> 2-4 PM weekdays
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div className="text-sm text-neutral-700">
                      <strong>Common feedback:</strong> "Easy to use" mentioned 47 times
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="text-sm text-neutral-700">
                      <strong>Drop-off point:</strong> Question 4 (redesign suggested)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Analytics Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <motion.div variants={cardVariants}>
            <Card className="p-6 h-full">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold mb-3 text-green-900">Sentiment Analysis</h4>
              <p className="text-green-800 text-sm mb-4">
                Automatically detect emotions and opinions in text responses. Know if your customers are happy, frustrated, or excited.
              </p>
              <div className="text-xs text-green-700 bg-green-100 p-2 rounded">
                "Love this feature!" → 😊 Positive (95% confidence)
              </div>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card className="p-6 h-full">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h4 className="text-lg font-bold mb-3 text-orange-900">Pattern Recognition</h4>
              <p className="text-orange-800 text-sm mb-4">
                Discover hidden trends and correlations across thousands of responses. Spot issues before they become problems.
              </p>
              <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded">
                Users aged 25-35 prefer mobile checkout 73% more
              </div>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card className="p-6 h-full">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold mb-3 text-purple-900">Smart Recommendations</h4>
              <p className="text-purple-800 text-sm mb-4">
                Get AI-powered suggestions to improve your forms, increase completion rates, and gather better data.
              </p>
              <div className="text-xs text-purple-700 bg-purple-100 p-2 rounded">
                💡 Move rating question earlier for 23% better completion
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Advanced Analytics Features */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mb-16"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-4 text-neutral-900">
            Advanced Analytics Features
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-neutral-600">
            Professional-grade analysis tools that help you understand your audience like never before
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="p-8 bg-gradient-to-br from-neutral-900 to-neutral-800 text-white">
            <h3 className="text-2xl font-bold mb-4">🎯 Response Heat Maps</h3>
            <p className="text-neutral-200 mb-6">
              See exactly where users spend time, where they drop off, and which questions generate the most engagement. Visual heat maps reveal user behavior patterns instantly.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-neutral-200">Question difficulty analysis</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-neutral-200">Time-spent visualization</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-neutral-200">Completion flow tracking</span>
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h3 className="text-2xl font-bold mb-4 text-blue-900">📊 Data Export & Reporting</h3>
            <p className="text-blue-800 mb-6">
              Generate beautiful, professional reports with charts, insights, and recommendations. Export raw data or polished presentations ready for stakeholders.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-800">Automated report generation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-800">Custom dashboard creation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-800">Real-time data streaming</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Data Visualization Examples */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <Card className="p-8">
            <h4 className="text-xl font-bold mb-4 text-teal-900">📋 Response Categorization</h4>
            <p className="text-teal-800 mb-6">
              AI automatically groups similar responses, making it easy to identify common themes in thousands of text responses.
            </p>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded border border-teal-200">
                <div className="text-sm font-medium text-teal-700 mb-1">Pricing Concerns (127 responses)</div>
                <div className="text-xs text-teal-600">"too expensive", "pricing unclear", "need cheaper option"</div>
              </div>
              <div className="bg-white p-3 rounded border border-teal-200">
                <div className="text-sm font-medium text-teal-700 mb-1">Feature Requests (89 responses)</div>
                <div className="text-xs text-teal-600">"dark mode", "mobile app", "better search"</div>
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h4 className="text-xl font-bold mb-4 text-rose-900">⏱️ Real-Time Monitoring</h4>
            <p className="text-rose-800 mb-6">
              Watch responses come in live, track completion rates in real-time, and get instant alerts when response patterns change.
            </p>
            <div className="bg-white p-4 rounded border border-rose-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-rose-700">Live Activity</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-xs text-rose-600 space-y-1">
                <div>• 3 responses in last 5 minutes</div>
                <div>• Completion rate: 89% (↑ 5%)</div>
                <div>• Avg. time: 2m 34s (↓ 12s)</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Big Data Visualization Section */}
        <Card className="p-8 md:p-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-4 text-slate-900">🔍 Handle Massive Datasets with Ease</h3>
            <p className="text-slate-700 max-w-3xl mx-auto">
              Whether you have 100 or 100,000 responses, our analytics engine processes and visualizes your data instantly. Never get overwhelmed by spreadsheets again.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-800 mb-2">99.9%</div>
              <div className="text-sm text-slate-600">Uptime reliability</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-800 mb-2">&lt;2s</div>
              <div className="text-sm text-slate-600">Average chart generation time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-800 mb-2">15+</div>
              <div className="text-sm text-slate-600">Visualization types available</div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="text-center"
      >
        <Card className="p-12 bg-gradient-to-r from-neutral-50 to-neutral-100">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-4 text-neutral-900">
            Ready to Transform Your Forms?
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-neutral-600 mb-8">
            Join thousands of users who've discovered the power of AI-driven form creation and intelligent data analysis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/create">
              <Button size="lg" className="font-bold">
                Try It Free - No Sign Up Required
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" size="lg" className="font-bold">
                View Pricing
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default FeaturesPage; 