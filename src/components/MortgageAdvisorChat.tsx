import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'advisor';
  content: string;
  timestamp: Date;
}

const MortgageAdvisorChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'advisor',
      content: 'Hi! I\'m your mortgage advisor. I can help you understand mortgage options, rates, and guide you through the home buying process. What questions do you have?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');

  const advisorResponses = {
    rate: 'Current average 30-year fixed rate is around 6.5%. Rates fluctuate daily based on economic conditions. Would you like me to check current rates for your situation?',
    'down payment': 'Typically, you need 3-20% down depending on the loan type. FHA loans allow 3.5%, conventional loans usually require 5-20%. What price range are you looking at?',
    'credit score': 'For the best rates, aim for 740+. With 620-739 you can still get conventional loans, but rates will be higher. FHA loans are available with 580+. Let me help you understand your options.',
    'pre-approval': 'Pre-approval is crucial! It shows sellers you\'re serious and gives you buying power. The process takes 1-2 weeks and involves credit check, income verification, and asset review.',
    refinance: 'Refinancing can lower your rate or change loan terms. Break-even analysis is key - calculate how long it takes for savings to cover closing costs. Current rates make it attractive for many homeowners.',
    default: 'I can help with mortgage rates, down payments, credit requirements, pre-approval process, refinancing, and general home buying advice. What specific question do you have?'
  };

  const getAdvisorResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('rate') || lowerMessage.includes('interest')) {
      return advisorResponses.rate;
    } else if (lowerMessage.includes('down payment') || lowerMessage.includes('down')) {
      return advisorResponses['down payment'];
    } else if (lowerMessage.includes('credit') || lowerMessage.includes('score')) {
      return advisorResponses['credit score'];
    } else if (lowerMessage.includes('pre-approval') || lowerMessage.includes('preapproval')) {
      return advisorResponses['pre-approval'];
    } else if (lowerMessage.includes('refinance') || lowerMessage.includes('refi')) {
      return advisorResponses.refinance;
    } else {
      return advisorResponses.default;
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Simulate advisor response
    setTimeout(() => {
      const advisorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'advisor',
        content: getAdvisorResponse(input),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, advisorMessage]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bot className="h-5 w-5 mr-2" />
          Mortgage Advisor
        </CardTitle>
        <CardDescription>
          Get personalized mortgage advice and answers to your questions
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {message.sender === 'advisor' ? <Bot className="h-4 w-4" /> : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about mortgages, rates, down payments..."
              className="flex-1"
            />
            <Button onClick={handleSend} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Try asking about: rates, down payments, credit scores, pre-approval, refinancing
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MortgageAdvisorChat;