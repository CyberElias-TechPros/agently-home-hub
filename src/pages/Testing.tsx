import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, Pause, Square, RotateCcw, FileText, Bug, Zap, Shield, Eye, CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, BarChart3, Activity, Target, Layers, Code, Smartphone, Globe, Server, Edit } from 'lucide-react';
import { mockTestSuites, mockTestCases, mockTestRuns, mockBugReports, mockPerformanceTests, mockAccessibilityTests, mockSecurityTests, mockTestCoverage, mockTestPipelines } from '@/lib/mockData';
import type { TestSuite, TestCase, TestRun, BugReport, PerformanceTest, AccessibilityTest, SecurityTest, TestCoverage, TestPipeline } from '@/types';

const Testing = () => {
  const [activeTab, setActiveTab] = useState('suites');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'idle': return 'bg-gray-500';
      case 'cancelled': return 'bg-orange-500';
      case 'pending': return 'bg-yellow-500';
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Testing & QA</h1>
        <p className="text-muted-foreground">Comprehensive testing suite with automated quality assurance</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="suites">Test Suites</TabsTrigger>
          <TabsTrigger value="cases">Test Cases</TabsTrigger>
          <TabsTrigger value="runs">Test Runs</TabsTrigger>
          <TabsTrigger value="bugs">Bug Reports</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="suites" className="mt-6">
          <div className="grid gap-6">
            {/* Test Suite Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Suites</CardTitle>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockTestSuites.length}</div>
                  <p className="text-xs text-muted-foreground">
                    6 active, 0 scheduled
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">83.2%</div>
                  <Progress value={83.2} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Bugs</CardTitle>
                  <Bug className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockBugReports.filter(b => b.status === 'open' || b.status === 'in_progress').length}</div>
                  <p className="text-xs text-muted-foreground">
                    {mockBugReports.filter(b => b.severity === 'critical').length} critical
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Coverage</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">86.7%</div>
                  <p className="text-xs text-muted-foreground">
                    +2.1% from last week
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Test Suites List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="h-5 w-5 mr-2" />
                  Test Suites
                </CardTitle>
                <CardDescription>Automated test suites across different categories</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="mb-4">
                  <Play className="h-4 w-4 mr-2" />
                  Run All Suites
                </Button>

                <div className="space-y-4">
                  {mockTestSuites.map((suite) => (
                    <Card key={suite.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold">{suite.name}</h4>
                              <Badge variant="outline">{suite.type}</Badge>
                              <Badge variant="secondary">{suite.category}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{suite.description}</p>
                            <div className="flex items-center space-x-4 text-sm">
                              <span>Tests: {suite.totalTests}</span>
                              <span className="text-green-600">✓ {suite.passedTests}</span>
                              <span className="text-red-600">✗ {suite.failedTests}</span>
                              <span className="text-yellow-600">⊘ {suite.skippedTests}</span>
                              {suite.coverage && <span>Coverage: {suite.coverage}%</span>}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(suite.status)}>
                              {suite.status}
                            </Badge>
                            <div className="flex space-x-1">
                              <Button size="sm" variant="outline">
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>Last run: {new Date(suite.lastRun).toLocaleString()}</span>
                          <span>Duration: {(suite.duration / 1000).toFixed(1)}s</span>
                        </div>

                        <Progress
                          value={(suite.passedTests / suite.totalTests) * 100}
                          className="mt-2"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cases" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Test Cases
                </CardTitle>
                <CardDescription>Detailed test cases with step-by-step execution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockTestCases.map((testCase) => (
                    <Card key={testCase.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold">{testCase.name}</h4>
                              <Badge className={getPriorityColor(testCase.priority)}>
                                {testCase.priority}
                              </Badge>
                              <Badge variant="outline">{testCase.type}</Badge>
                              <Badge className={getStatusColor(testCase.status)}>
                                {testCase.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{testCase.description}</p>
                            <div className="text-sm">
                              <span className="font-medium">Steps:</span> {testCase.steps.length} •
                              {testCase.duration && <span className="ml-2">Duration: {(testCase.duration / 1000).toFixed(1)}s</span>}
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>

                        {testCase.errorMessage && (
                          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                            <div className="flex items-start space-x-2">
                              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-red-800">Test Failed</p>
                                <p className="text-sm text-red-700">{testCase.errorMessage}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>Created: {new Date(testCase.createdAt).toLocaleDateString()}</span>
                          <span>Updated: {new Date(testCase.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="runs" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Test Runs
                </CardTitle>
                <CardDescription>Test execution history and results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockTestRuns.map((run) => (
                    <Card key={run.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold">Suite: {mockTestSuites.find(s => s.id === run.suiteId)?.name}</h4>
                              <Badge className={getStatusColor(run.status)}>
                                {run.status}
                              </Badge>
                              <Badge variant="outline">{run.triggerType}</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Environment:</span>
                                <span className="ml-1 font-medium">{run.environment}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total Tests:</span>
                                <span className="ml-1 font-medium">{run.totalTests}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Passed:</span>
                                <span className="ml-1 font-medium text-green-600">{run.passedTests}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Failed:</span>
                                <span className="ml-1 font-medium text-red-600">{run.failedTests}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <FileText className="h-4 w-4 mr-1" />
                              Report
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                          <span>Started: {new Date(run.startTime).toLocaleString()}</span>
                          {run.endTime && (
                            <span>Duration: {run.duration ? `${Math.floor(run.duration / 60000)}m ${Math.floor((run.duration % 60000) / 1000)}s` : 'N/A'}</span>
                          )}
                        </div>

                        {run.coverage && (
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="text-muted-foreground">Coverage:</span>
                            <span className="font-medium">{run.coverage}%</span>
                            <Progress value={run.coverage} className="flex-1 max-w-32" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bugs" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bug className="h-5 w-5 mr-2" />
                  Bug Reports
                </CardTitle>
                <CardDescription>Track and manage software defects</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="mb-4">
                  <Bug className="h-4 w-4 mr-2" />
                  Report New Bug
                </Button>

                <div className="space-y-4">
                  {mockBugReports.map((bug) => (
                    <Card key={bug.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold">{bug.title}</h4>
                              <Badge className={getSeverityColor(bug.severity)}>
                                {bug.severity}
                              </Badge>
                              <Badge className={getPriorityColor(bug.priority)}>
                                {bug.priority}
                              </Badge>
                              <Badge className={getStatusColor(bug.status)}>
                                {bug.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{bug.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>Component: {bug.component}</span>
                              <span>Reporter: {bug.reporter}</span>
                              <span>Environment: {bug.environment}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(bug.createdAt).toLocaleDateString()} •
                          Updated: {new Date(bug.updatedAt).toLocaleDateString()} •
                          Comments: {bug.comments.length}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Performance Tests
                </CardTitle>
                <CardDescription>Load testing and performance monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {mockPerformanceTests.map((test) => (
                    <Card key={test.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{test.name}</CardTitle>
                            <CardDescription>{test.description}</CardDescription>
                          </div>
                          <Badge className={getStatusColor(test.status)}>
                            {test.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div>
                            <p className="text-sm text-muted-foreground">Type</p>
                            <p className="font-medium capitalize">{test.type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Target</p>
                            <p className="font-medium">{test.targetUrl}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Users</p>
                            <p className="font-medium">{test.concurrentUsers}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Duration</p>
                            <p className="font-medium">{test.duration} min</p>
                          </div>
                        </div>

                        {test.metrics.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">Performance Metrics</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                                <p className="text-2xl font-bold">{test.metrics[test.metrics.length - 1].responseTime}ms</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Throughput</p>
                                <p className="text-2xl font-bold">{test.metrics[test.metrics.length - 1].throughput}/s</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Error Rate</p>
                                <p className="text-2xl font-bold text-red-600">{test.metrics[test.metrics.length - 1].errorRate}%</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Active Users</p>
                                <p className="text-2xl font-bold">{test.metrics[test.metrics.length - 1].activeUsers}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex space-x-2 mt-4">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View Report
                          </Button>
                          <Button size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Run Test
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accessibility" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Accessibility Testing
                </CardTitle>
                <CardDescription>WCAG compliance and accessibility audits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {mockAccessibilityTests.map((test) => (
                    <Card key={test.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{test.pageUrl}</CardTitle>
                            <CardDescription>Standard: {test.standard}</CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{test.score}/100</div>
                            <Badge className={test.score >= 90 ? 'bg-green-100 text-green-800' : test.score >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                              {test.score >= 90 ? 'Pass' : test.score >= 70 ? 'Needs Work' : 'Fail'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div>
                            <p className="text-sm text-muted-foreground">Violations</p>
                            <p className="text-2xl font-bold text-red-600">{test.violations.length}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Critical</p>
                            <p className="text-2xl font-bold text-red-600">
                              {test.violations.filter(v => v.impact === 'critical').length}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Serious</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {test.violations.filter(v => v.impact === 'serious').length}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Tested</p>
                            <p className="font-medium">{new Date(test.testedAt!).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {test.violations.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">Top Violations</h4>
                            <div className="space-y-2">
                              {test.violations.slice(0, 3).map((violation, index) => (
                                <div key={index} className="flex items-start space-x-3 p-3 border rounded">
                                  <Badge className={getSeverityColor(violation.impact)}>
                                    {violation.impact}
                                  </Badge>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{violation.description}</p>
                                    <p className="text-xs text-muted-foreground">{violation.help}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex space-x-2 mt-4">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Full Report
                          </Button>
                          <Button size="sm">
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Re-run Test
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security Testing
                </CardTitle>
                <CardDescription>Vulnerability scanning and security assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {mockSecurityTests.map((test) => (
                    <Card key={test.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{test.name}</CardTitle>
                            <CardDescription>Type: {test.type.replace('_', ' ')}</CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{test.score}/100</div>
                            <Badge className={test.score >= 80 ? 'bg-green-100 text-green-800' : test.score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                              {test.score >= 80 ? 'Secure' : test.score >= 60 ? 'Warning' : 'Critical'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div>
                            <p className="text-sm text-muted-foreground">Vulnerabilities</p>
                            <p className="text-2xl font-bold text-red-600">{test.vulnerabilities.length}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Critical</p>
                            <p className="text-2xl font-bold text-red-600">
                              {test.vulnerabilities.filter(v => v.severity === 'critical').length}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">High</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {test.vulnerabilities.filter(v => v.severity === 'high').length}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Tested</p>
                            <p className="font-medium">{new Date(test.testedAt!).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {test.vulnerabilities.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">Critical Vulnerabilities</h4>
                            <div className="space-y-2">
                              {test.vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').slice(0, 3).map((vuln, index) => (
                                <div key={index} className="flex items-start space-x-3 p-3 border rounded">
                                  <Badge className={getSeverityColor(vuln.severity)}>
                                    {vuln.severity}
                                  </Badge>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{vuln.title}</p>
                                    <p className="text-xs text-muted-foreground">{vuln.description}</p>
                                    <p className="text-xs text-blue-600 mt-1">{vuln.recommendation}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex space-x-2 mt-4">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Full Report
                          </Button>
                          <Button size="sm">
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Re-scan
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="coverage" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Test Coverage
                </CardTitle>
                <CardDescription>Code coverage metrics and analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-4">Coverage by Component</h4>
                    <div className="space-y-4">
                      {mockTestCoverage.map((coverage) => (
                        <div key={coverage.id}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">{coverage.component}</span>
                            <span className="text-sm font-medium">{coverage.coverage}%</span>
                          </div>
                          <Progress value={coverage.coverage} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{coverage.covered}/{coverage.total} {coverage.type}</span>
                            <span>Updated: {new Date(coverage.lastUpdated).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">CI/CD Pipeline</h4>
                    {mockTestPipelines.map((pipeline) => (
                      <Card key={pipeline.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-semibold">{pipeline.name}</h4>
                              <p className="text-sm text-muted-foreground">{pipeline.description}</p>
                            </div>
                            <Badge className={getStatusColor(pipeline.status)}>
                              {pipeline.status}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {pipeline.stages.map((stage, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center space-x-2">
                                  <Badge className={getStatusColor(stage.status)} variant="outline">
                                    {stage.name}
                                  </Badge>
                                  {stage.duration && (
                                    <span className="text-xs text-muted-foreground">
                                      {(stage.duration / 1000).toFixed(1)}s
                                    </span>
                                  )}
                                </div>
                                <Badge className={getStatusColor(stage.status)}>
                                  {stage.status}
                                </Badge>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center text-sm text-muted-foreground mt-4">
                            <span>Started: {new Date(pipeline.startedAt!).toLocaleString()}</span>
                            {pipeline.duration && (
                              <span>Duration: {Math.floor(pipeline.duration / 60000)}m {Math.floor((pipeline.duration % 60000) / 1000)}s</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Testing;