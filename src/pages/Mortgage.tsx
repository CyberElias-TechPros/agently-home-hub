import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, DollarSign, TrendingUp, BarChart3, Users, CreditCard, Building, Home, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { MortgageCalculator, MortgageResult, AffordabilityCalculator, AffordabilityResult, MortgageRate, RefinanceComparison, PreQualificationResult } from '@/types';

const Mortgage = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('calculator');
  
  // Mortgage Calculator State
  const [calculator, setCalculator] = useState<MortgageCalculator>({
    loanAmount: 300000,
    interestRate: 6.5,
    loanTerm: 30,
    downPayment: 60000,
    propertyTax: 3600,
    insurance: 1200,
    pmi: 200
  });
  
  // Affordability Calculator State
  const [affordability, setAffordability] = useState<AffordabilityCalculator>({
    annualIncome: 80000,
    monthlyDebt: 800,
    downPayment: 60000,
    interestRate: 6.5,
    loanTerm: 30,
    propertyTaxRate: 1.2,
    insuranceRate: 0.4
  });
  
  // Results State
  const [mortgageResult, setMortgageResult] = useState<MortgageResult | null>(null);
  const [affordabilityResult, setAffordabilityResult] = useState<AffordabilityResult | null>(null);
  const [rates, setRates] = useState<MortgageRate[]>([]);
  const [refinanceData, setRefinanceData] = useState<RefinanceComparison | null>(null);
  const [preQualData, setPreQualData] = useState<PreQualificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadMortgageRates();
    }
  }, [isAuthenticated]);

  const loadMortgageRates = async () => {
    try {
      const ratesData = await apiService.getMortgageRates();
      setRates(ratesData);
    } catch (error) {
      toast({
        title: "Error loading rates",
        description: "Failed to load current mortgage rates.",
        variant: "destructive",
      });
    }
  };

  const calculateMortgage = async () => {
    try {
      setLoading(true);
      const result = await apiService.calculateMortgage(calculator);
      setMortgageResult(result);
      toast({
        title: "Calculation Complete",
        description: `Monthly payment: $${result.monthlyPayment.toFixed(2)}`,
      });
    } catch (error) {
      toast({
        title: "Calculation Failed",
        description: "Please check your inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAffordability = async () => {
    try {
      setLoading(true);
      const result = await apiService.calculateAffordability(affordability);
      setAffordabilityResult(result);
      toast({
        title: "Affordability Analysis Complete",
        description: `You can afford up to $${result.maxHomePrice.toLocaleString()}`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Please check your inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPreQualification = async () => {
    try {
      setLoading(true);
      const result = await apiService.getPreQualification(affordability);
      setPreQualData(result);
      toast({
        title: "Pre-Qualification Complete",
        description: `Pre-qualified amount: $${result.preQualifiedAmount.toLocaleString()}`,
      });
    } catch (error) {
      toast({
        title: "Pre-Qualification Failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const compareRefinance = async () => {
    try {
      setLoading(true);
      const result = await apiService.compareRefinance({
        currentLoan: {
          balance: 280000,
          rate: 7.5,
          monthlyPayment: 2333,
          remainingTerm: 25
        },
        newLoan: {
          rate: 6.25,
          term: 30,
          closingCosts: 5000
        }
      });
      setRefinanceData(result);
      toast({
        title: "Refinance Analysis Complete",
        description: `Monthly savings: $${result.newLoan.monthlyPayment - result.currentLoan.monthlyPayment}`,
      });
    } catch (error) {
      toast({
        title: "Refinance Analysis Failed",
        description: "Please check your inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mortgage & Financial Services</h1>
        <p className="text-muted-foreground">Calculate payments, check rates, and get pre-qualified</p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to access mortgage calculators and financial tools.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="calculator">Mortgage Calculator</TabsTrigger>
            <TabsTrigger value="affordability">Affordability</TabsTrigger>
            <TabsTrigger value="rates">Current Rates</TabsTrigger>
            <TabsTrigger value="refinance">Refinance</TabsTrigger>
            <TabsTrigger value="prequal">Pre-Qualification</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    Mortgage Calculator
                  </CardTitle>
                  <CardDescription>Calculate your monthly mortgage payment</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); calculateMortgage(); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="home-price">Home Price</Label>
                        <Input
                          id="home-price"
                          type="number"
                          value={calculator.loanAmount + calculator.downPayment}
                          onChange={(e) => {
                            const homePrice = parseFloat(e.target.value);
                            setCalculator({...calculator, loanAmount: homePrice - calculator.downPayment});
                          }}
                          placeholder="400000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="down-payment">Down Payment</Label>
                        <Input
                          id="down-payment"
                          type="number"
                          value={calculator.downPayment}
                          onChange={(e) => {
                            const downPayment = parseFloat(e.target.value);
                            setCalculator({...calculator, downPayment});
                          }}
                          placeholder="60000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                        <Input
                          id="interest-rate"
                          type="number"
                          step="0.1"
                          value={calculator.interestRate}
                          onChange={(e) => setCalculator({...calculator, interestRate: parseFloat(e.target.value)})}
                          placeholder="6.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="loan-term">Loan Term (years)</Label>
                        <Select
                          value={calculator.loanTerm.toString()}
                          onValueChange={(value) => setCalculator({...calculator, loanTerm: parseInt(value)})}
                        >
                          <SelectTrigger id="loan-term">
                            <SelectValue placeholder="30" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 years</SelectItem>
                            <SelectItem value="20">20 years</SelectItem>
                            <SelectItem value="30">30 years</SelectItem>
                            <SelectItem value="40">40 years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="property-tax">Annual Property Tax</Label>
                        <Input
                          id="property-tax"
                          type="number"
                          value={calculator.propertyTax}
                          onChange={(e) => setCalculator({...calculator, propertyTax: parseFloat(e.target.value)})}
                          placeholder="3600"
                        />
                      </div>
                      <div>
                        <Label htmlFor="home-insurance">Annual Home Insurance</Label>
                        <Input
                          id="home-insurance"
                          type="number"
                          value={calculator.insurance}
                          onChange={(e) => setCalculator({...calculator, insurance: parseFloat(e.target.value)})}
                          placeholder="1200"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="pmi">Monthly PMI</Label>
                      <Input
                        id="pmi"
                        type="number"
                        value={calculator.pmi}
                        onChange={(e) => setCalculator({...calculator, pmi: parseFloat(e.target.value)})}
                        placeholder="200"
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <Calculator className="h-4 w-4 mr-2" />
                          Calculate Payment
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {mortgageResult && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Breakdown</CardTitle>
                    <CardDescription>Your estimated monthly payment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-primary/10 rounded-lg">
                          <div className="text-2xl font-bold text-primary">${mortgageResult.monthlyPayment.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">Monthly Payment</div>
                        </div>
                        <div className="text-center p-4 bg-green-100 rounded-lg">
                          <div className="text-2xl font-bold text-green-700">${(mortgageResult.monthlyPayment * 12 * calculator.loanTerm).toFixed(0)}</div>
                          <div className="text-sm text-green-700">Total Cost</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Principal & Interest</span>
                          <span>${((mortgageResult.monthlyPayment * calculator.loanTerm * 12) - calculator.loanAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Interest</span>
                          <span>${(mortgageResult.totalInterest).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Property Tax</span>
                          <span>${(calculator.propertyTax / 12).toFixed(2)}/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Home Insurance</span>
                          <span>${(calculator.insurance / 12).toFixed(2)}/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">PMI</span>
                          <span>${calculator.pmi.toFixed(2)}/mo</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Loan Amount</p>
                          <p className="font-semibold">${calculator.loanAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Down Payment</p>
                          <p className="font-semibold">${calculator.downPayment.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Interest Rate</p>
                          <p className="font-semibold">{calculator.interestRate}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Loan Term</p>
                          <p className="font-semibold">{calculator.loanTerm} years</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="affordability" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Affordability Calculator
                  </CardTitle>
                  <CardDescription>Find out how much house you can afford</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); calculateAffordability(); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="annual-income">Annual Income</Label>
                        <Input
                          id="annual-income"
                          type="number"
                          value={affordability.annualIncome}
                          onChange={(e) => setAffordability({...affordability, annualIncome: parseFloat(e.target.value)})}
                          placeholder="80000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="monthly-debt">Monthly Debt</Label>
                        <Input
                          id="monthly-debt"
                          type="number"
                          value={affordability.monthlyDebt}
                          onChange={(e) => setAffordability({...affordability, monthlyDebt: parseFloat(e.target.value)})}
                          placeholder="800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="down-payment-aff">Down Payment</Label>
                        <Input
                          id="down-payment-aff"
                          type="number"
                          value={affordability.downPayment}
                          onChange={(e) => setAffordability({...affordability, downPayment: parseFloat(e.target.value)})}
                          placeholder="60000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="interest-rate-aff">Interest Rate (%)</Label>
                        <Input
                          id="interest-rate-aff"
                          type="number"
                          step="0.1"
                          value={affordability.interestRate}
                          onChange={(e) => setAffordability({...affordability, interestRate: parseFloat(e.target.value)})}
                          placeholder="6.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="property-tax-rate">Property Tax Rate (%)</Label>
                        <Input
                          id="property-tax-rate"
                          type="number"
                          step="0.1"
                          value={affordability.propertyTaxRate}
                          onChange={(e) => setAffordability({...affordability, propertyTaxRate: parseFloat(e.target.value)})}
                          placeholder="1.2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="insurance-rate">Home Insurance Rate (%)</Label>
                        <Input
                          id="insurance-rate"
                          type="number"
                          step="0.1"
                          value={affordability.insuranceRate}
                          onChange={(e) => setAffordability({...affordability, insuranceRate: parseFloat(e.target.value)})}
                          placeholder="0.4"
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Calculate Affordability
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {affordabilityResult && (
                <Card>
                  <CardHeader>
                    <CardTitle>Results</CardTitle>
                    <CardDescription>Your affordability analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-100 rounded-lg">
                          <div className="text-2xl font-bold text-green-700">${affordabilityResult.maxHomePrice.toLocaleString()}</div>
                          <div className="text-sm text-green-700">Max Home Price</div>
                        </div>
                        <div className="text-center p-4 bg-blue-100 rounded-lg">
                          <div className="text-2xl font-bold text-blue-700">${affordabilityResult.monthlyPayment.toFixed(2)}</div>
                          <div className="text-sm text-blue-700">Monthly Payment</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Debt-to-Income Ratio</span>
                          <Badge variant={affordabilityResult.debtToIncomeRatio > 43 ? "destructive" : "default"}>
                            {affordabilityResult.debtToIncomeRatio}%
                          </Badge>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${affordabilityResult.debtToIncomeRatio > 43 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(affordabilityResult.debtToIncomeRatio, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Loan Amount</p>
                          <p className="font-semibold">${affordabilityResult.maxLoanAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Down Payment</p>
                          <p className="font-semibold">${affordability.downPayment.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Interest Rate</p>
                          <p className="font-semibold">{affordability.interestRate}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Loan Term</p>
                          <p className="font-semibold">{affordability.loanTerm} years</p>
                        </div>
                      </div>

                      {affordabilityResult.debtToIncomeRatio > 43 && (
                        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="font-semibold text-red-700">High DTI Ratio</p>
                            <p className="text-sm text-red-600">Your debt-to-income ratio is above 43%. Consider paying down debt or increasing income.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rates" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Current Mortgage Rates
                </CardTitle>
                <CardDescription>Live rates from our partner lenders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">6.125%</div>
                    <div className="text-sm text-green-700">Best 30-Year Rate</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">5.875%</div>
                    <div className="text-sm text-blue-700">Best 15-Year Rate</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700">6.25%</div>
                    <div className="text-sm text-purple-700">Average Rate</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lender</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>APR</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Fees</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.map((rate) => (
                      <TableRow key={rate.lender}>
                        <TableCell className="font-medium">{rate.lender}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">{rate.rate}%</span>
                            {rate.rate === Math.min(...rates.map(r => r.rate)) && (
                              <Badge variant="secondary">Best</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{rate.apr}%</TableCell>
                        <TableCell>{rate.points} points</TableCell>
                        <TableCell>${rate.fees.toLocaleString()}</TableCell>
                        <TableCell>{new Date(rate.lastUpdated).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">Lock Rate</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refinance" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Refinance Calculator
                  </CardTitle>
                  <CardDescription>See if refinancing makes sense for you</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); compareRefinance(); }} className="space-y-4">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Current Loan</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Current Balance</Label>
                          <Input type="number" placeholder="280000" />
                        </div>
                        <div>
                          <Label>Current Rate</Label>
                          <Input type="number" step="0.1" placeholder="7.5" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Monthly Payment</Label>
                          <Input type="number" placeholder="2333" />
                        </div>
                        <div>
                          <Label>Remaining Term</Label>
                          <Input type="number" placeholder="25" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">New Loan</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>New Rate</Label>
                          <Input type="number" step="0.1" placeholder="6.25" />
                        </div>
                        <div>
                          <Label>New Term</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="30" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15 years</SelectItem>
                              <SelectItem value="20">20 years</SelectItem>
                              <SelectItem value="30">30 years</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Closing Costs</Label>
                        <Input type="number" placeholder="5000" />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Compare Refinance
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {refinanceData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Refinance Analysis</CardTitle>
                    <CardDescription>Should you refinance?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-100 rounded-lg">
                          <div className="text-2xl font-bold text-green-700">
                            ${refinanceData.newLoan.monthlyPayment - refinanceData.currentLoan.monthlyPayment > 0 ? 
                              `+$${(refinanceData.newLoan.monthlyPayment - refinanceData.currentLoan.monthlyPayment).toFixed(2)}` :
                              `-$${(refinanceData.currentLoan.monthlyPayment - refinanceData.newLoan.monthlyPayment).toFixed(2)}`
                            }
                          </div>
                          <div className="text-sm text-green-700">Monthly Change</div>
                        </div>
                        <div className="text-center p-4 bg-blue-100 rounded-lg">
                          <div className="text-2xl font-bold text-blue-700">{refinanceData.newLoan.breakEvenPoint} months</div>
                          <div className="text-sm text-blue-700">Break Even Point</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Monthly Payment</span>
                          <span>${refinanceData.currentLoan.monthlyPayment.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">New Monthly Payment</span>
                          <span>${refinanceData.newLoan.monthlyPayment.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Closing Costs</span>
                          <span>${refinanceData.newLoan.closingCosts.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Savings</span>
                          <span className="font-semibold text-green-600">${refinanceData.newLoan.totalSavings.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-semibold text-blue-700">Recommendation</p>
                          <p className="text-sm text-blue-600">
                            {refinanceData.newLoan.monthlyPayment < refinanceData.currentLoan.monthlyPayment 
                              ? `Refinancing could save you $${(refinanceData.currentLoan.monthlyPayment - refinanceData.newLoan.monthlyPayment).toFixed(2)} per month.`
                              : 'Consider keeping your current loan as refinancing may not provide significant savings.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="prequal" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Pre-Qualification
                  </CardTitle>
                  <CardDescription>Get pre-qualified in minutes</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); getPreQualification(); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Annual Income</Label>
                        <Input
                          type="number"
                          value={affordability.annualIncome}
                          onChange={(e) => setAffordability({...affordability, annualIncome: parseFloat(e.target.value)})}
                          placeholder="80000"
                        />
                      </div>
                      <div>
                        <Label>Credit Score</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="720-739" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">740+</SelectItem>
                            <SelectItem value="good">700-739</SelectItem>
                            <SelectItem value="fair">670-699</SelectItem>
                            <SelectItem value="poor">620-669</SelectItem>
                            <SelectItem value="bad">Below 620</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Down Payment</Label>
                        <Input
                          type="number"
                          value={affordability.downPayment}
                          onChange={(e) => setAffordability({...affordability, downPayment: parseFloat(e.target.value)})}
                          placeholder="60000"
                        />
                      </div>
                      <div>
                        <Label>Employment Status</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Employed" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employed">Employed</SelectItem>
                            <SelectItem value="self-employed">Self-Employed</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                            <SelectItem value="unemployed">Unemployed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Property Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Single Family Home" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single Family Home</SelectItem>
                          <SelectItem value="condo">Condo</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                          <SelectItem value="multi">Multi-Family</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Users className="h-4 w-4 mr-2" />
                          Get Pre-Qualified
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {preQualData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pre-Qualification Results</CardTitle>
                    <CardDescription>Your estimated loan amount</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-3xl font-bold text-green-700">${preQualData.preQualifiedAmount.toLocaleString()}</div>
                        <div className="text-sm text-green-700">Pre-Qualified Amount</div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold">Next Steps</h4>
                        <div className="space-y-2">
                          {preQualData.nextSteps.map((step, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold">Factors Considered</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {preQualData.factors.map((factor, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">{factor}</Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button>Apply Now</Button>
                        <Button variant="outline">Find Lenders</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Mortgage;