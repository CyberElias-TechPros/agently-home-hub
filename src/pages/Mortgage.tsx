import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, TrendingUp, DollarSign, Home } from 'lucide-react';
import { mockMortgageCalculator, mockMortgageResult, mockAffordabilityCalculator, mockAffordabilityResult, mockMortgageRates, mockRefinanceComparison } from '@/lib/mockData';
import { calculateMortgagePayment, calculateAffordability } from '@/lib/utils';
import { MortgageCalculator as MortgageCalcType, AffordabilityCalculator as AffordabilityCalcType } from '@/types';
import MortgageAdvisorChat from '@/components/MortgageAdvisorChat';

const Mortgage = () => {
  const [activeTab, setActiveTab] = useState('calculator');
  const [mortgageInputs, setMortgageInputs] = useState<MortgageCalcType>(mockMortgageCalculator);
  const [affordabilityInputs, setAffordabilityInputs] = useState<AffordabilityCalcType>(mockAffordabilityCalculator);

  const mortgageResult = calculateMortgagePayment(mortgageInputs);
  const affordabilityResult = calculateAffordability(affordabilityInputs);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mortgage Calculator</h1>
        <p className="text-muted-foreground">Calculate payments, affordability, and compare options</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="affordability">Affordability</TabsTrigger>
          <TabsTrigger value="rates">Rates</TabsTrigger>
          <TabsTrigger value="refinance">Refinance</TabsTrigger>
          <TabsTrigger value="advisor">Advisor Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Mortgage Calculator
                </CardTitle>
                <CardDescription>Enter your loan details to calculate payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="loanAmount">Loan Amount</Label>
                    <Input
                      id="loanAmount"
                      type="number"
                      value={mortgageInputs.loanAmount}
                      onChange={(e) => setMortgageInputs({...mortgageInputs, loanAmount: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="interestRate">Interest Rate (%)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.01"
                      value={mortgageInputs.interestRate}
                      onChange={(e) => setMortgageInputs({...mortgageInputs, interestRate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="loanTerm">Loan Term (years)</Label>
                    <Input
                      id="loanTerm"
                      type="number"
                      value={mortgageInputs.loanTerm}
                      onChange={(e) => setMortgageInputs({...mortgageInputs, loanTerm: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="downPayment">Down Payment</Label>
                    <Input
                      id="downPayment"
                      type="number"
                      value={mortgageInputs.downPayment}
                      onChange={(e) => setMortgageInputs({...mortgageInputs, downPayment: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="propertyTax">Annual Property Tax</Label>
                    <Input
                      id="propertyTax"
                      type="number"
                      value={mortgageInputs.propertyTax}
                      onChange={(e) => setMortgageInputs({...mortgageInputs, propertyTax: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="insurance">Annual Insurance</Label>
                    <Input
                      id="insurance"
                      type="number"
                      value={mortgageInputs.insurance}
                      onChange={(e) => setMortgageInputs({...mortgageInputs, insurance: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
                <CardDescription>Your estimated monthly payment breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">${mortgageResult.monthlyPayment.toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground">Monthly Payment</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Principal & Interest</p>
                    <p className="font-semibold">${(mortgageResult.monthlyPayment - mortgageInputs.propertyTax/12 - mortgageInputs.insurance/12 - (mortgageInputs.pmi || 0)).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Property Tax</p>
                    <p className="font-semibold">${(mortgageInputs.propertyTax / 12).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Insurance</p>
                    <p className="font-semibold">${(mortgageInputs.insurance / 12).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PMI</p>
                    <p className="font-semibold">${(mortgageInputs.pmi || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Interest</span>
                    <span className="font-semibold">${mortgageResult.totalInterest.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Payments</span>
                    <span className="font-semibold">${mortgageResult.totalPayment.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="affordability" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="h-5 w-5 mr-2" />
                  Affordability Calculator
                </CardTitle>
                <CardDescription>Determine how much home you can afford</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="annualIncome">Annual Income</Label>
                    <Input
                      id="annualIncome"
                      type="number"
                      value={affordabilityInputs.annualIncome}
                      onChange={(e) => setAffordabilityInputs({...affordabilityInputs, annualIncome: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthlyDebt">Monthly Debt</Label>
                    <Input
                      id="monthlyDebt"
                      type="number"
                      value={affordabilityInputs.monthlyDebt}
                      onChange={(e) => setAffordabilityInputs({...affordabilityInputs, monthlyDebt: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="downPayment">Down Payment</Label>
                    <Input
                      id="downPayment"
                      type="number"
                      value={affordabilityInputs.downPayment}
                      onChange={(e) => setAffordabilityInputs({...affordabilityInputs, downPayment: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="interestRate">Interest Rate (%)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.01"
                      value={affordabilityInputs.interestRate}
                      onChange={(e) => setAffordabilityInputs({...affordabilityInputs, interestRate: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Affordability Results</CardTitle>
                <CardDescription>Based on your financial information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">${affordabilityResult.maxHomePrice.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Maximum Home Price</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Max Loan Amount</p>
                    <p className="font-semibold">${affordabilityResult.maxLoanAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Payment</p>
                    <p className="font-semibold">${affordabilityResult.monthlyPayment.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Debt-to-Income Ratio</p>
                    <p className="font-semibold">{affordabilityResult.debtToIncomeRatio.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recommended</p>
                    <p className="font-semibold text-green-600">Within Budget</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rates" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockMortgageRates.map((rate, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{rate.lender}</CardTitle>
                  <CardDescription>{rate.term}-year fixed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Rate</span>
                      <span className="font-semibold">{rate.rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">APR</span>
                      <span>{rate.apr}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Points</span>
                      <span>{rate.points}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Fees</span>
                      <span>${rate.fees}</span>
                    </div>
                    <Button className="w-full mt-4">Apply Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="refinance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Refinance Comparison
              </CardTitle>
              <CardDescription>Compare your current loan with refinance options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-4">Current Loan</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <span>${mockRefinanceComparison.currentLoan.balance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Rate</span>
                      <span>{mockRefinanceComparison.currentLoan.rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Monthly Payment</span>
                      <span>${mockRefinanceComparison.currentLoan.monthlyPayment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Remaining Term</span>
                      <span>{mockRefinanceComparison.currentLoan.remainingTerm} years</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">New Loan</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Rate</span>
                      <span className="text-green-600">{mockRefinanceComparison.newLoan.rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Monthly Payment</span>
                      <span className="text-green-600">${mockRefinanceComparison.newLoan.monthlyPayment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Monthly Savings</span>
                      <span className="text-green-600">${mockRefinanceComparison.newLoan.totalSavings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Break-even Point</span>
                      <span>{mockRefinanceComparison.newLoan.breakEvenPoint} months</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <p className="text-green-800 font-semibold">Potential Savings: ${mockRefinanceComparison.newLoan.totalSavings * 12 * 30} over 30 years</p>
                <p className="text-sm text-green-600 mt-1">Closing costs: ${mockRefinanceComparison.newLoan.closingCosts}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advisor" className="mt-6">
          <MortgageAdvisorChat />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Mortgage;