"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Calendar, CheckCircle, AlertCircle, ArrowRight } from "lucide-react"

export function ProfileSubscription() {
  // Sample subscription data
  const subscription = {
    plan: "Pro",
    status: "active",
    billingCycle: "monthly",
    nextBillingDate: "February 15, 2024",
    amount: "$49.99",
    paymentMethod: {
      type: "credit_card",
      last4: "4242",
      expiryDate: "06/25",
      brand: "Visa",
    },
    features: [
      { name: "Characters", used: 8653, limit: 10000, unlimited: false },
      { name: "Audio Minutes", used: 120, limit: 500, unlimited: false },
      { name: "Custom Voices", used: 2, limit: 5, unlimited: false },
      { name: "API Access", used: 0, limit: 0, unlimited: true },
      { name: "Priority Support", used: 0, limit: 0, unlimited: true },
    ],
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Manage your subscription and usage</CardDescription>
            </div>
            <Badge variant="default" className="text-sm py-1">
              {subscription.plan}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p className="font-medium">Active</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billing Cycle</p>
              <p className="font-medium capitalize">{subscription.billingCycle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Billing Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{subscription.nextBillingDate}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-medium">{subscription.amount}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Usage Limits</h3>
            {subscription.features.map((feature, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{feature.name}</span>
                  <span>
                    {feature.unlimited ? (
                      "Unlimited"
                    ) : (
                      <>
                        {feature.used} / {feature.limit}
                      </>
                    )}
                  </span>
                </div>
                {!feature.unlimited && (
                  <Progress
                    value={(feature.used / feature.limit) * 100}
                    className="h-2"
                    color={
                      feature.used / feature.limit > 0.9
                        ? "bg-red-500"
                        : feature.used / feature.limit > 0.7
                          ? "bg-yellow-500"
                          : "bg-primary"
                    }
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button variant="outline">Change Plan</Button>
            <Button variant="destructive">Cancel Subscription</Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <CardDescription>Manage your payment details and billing address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-2 rounded-md">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">
                  {subscription.paymentMethod.brand} •••• {subscription.paymentMethod.last4}
                </p>
                <p className="text-sm text-muted-foreground">Expires {subscription.paymentMethod.expiryDate}</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Update
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button variant="outline">Billing History</Button>
            <Button variant="outline">Download Invoices</Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Compare and upgrade to a different plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Basic Plan */}
            <div className="border rounded-lg p-4 flex flex-col">
              <h3 className="font-medium text-lg">Basic</h3>
              <div className="text-3xl font-bold my-2">$19.99</div>
              <p className="text-sm text-muted-foreground mb-4">per month</p>
              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>5,000 characters</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>100 audio minutes</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>1 custom voice</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">No API access</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full">
                Downgrade
              </Button>
            </div>

            {/* Pro Plan (Current) */}
            <div className="border-2 border-primary rounded-lg p-4 flex flex-col relative">
              <Badge className="absolute top-4 right-4">Current</Badge>
              <h3 className="font-medium text-lg">Pro</h3>
              <div className="text-3xl font-bold my-2">$49.99</div>
              <p className="text-sm text-muted-foreground mb-4">per month</p>
              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>10,000 characters</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>500 audio minutes</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>5 custom voices</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>API access</span>
                </li>
              </ul>
              <Button disabled className="w-full">
                Current Plan
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="border rounded-lg p-4 flex flex-col bg-muted/50">
              <h3 className="font-medium text-lg">Enterprise</h3>
              <div className="text-3xl font-bold my-2">$199.99</div>
              <p className="text-sm text-muted-foreground mb-4">per month</p>
              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Unlimited characters</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Unlimited audio minutes</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Unlimited custom voices</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Priority API access</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Dedicated support</span>
                </li>
              </ul>
              <Button className="w-full">
                Upgrade
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
