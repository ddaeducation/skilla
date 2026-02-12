import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, CheckCircle, Loader2, Shield, Tag, X } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";

interface Course {
  id: string;
  title: string;
  school: string;
  price: number;
  monthly_price: number | null;
  description: string | null;
  duration: string | null;
}
const FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK-a45366014ecf1df9a254802e2f6f104a-X";

// Currency exchange rates (USD as base)
const CURRENCY_CONFIG = {
  USD: { symbol: "$", rate: 1, name: "US Dollar" },
  RWF: { symbol: "RWF", rate: 1450, name: "Rwandan Franc" },
};

const Apply = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "RWF">("USD");
  
  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discount_type: "percentage" | "amount";
    discount_value: number;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  
  // Get program info from URL if coming from Programs page
  const programFromUrl = searchParams.get('program');
  const programType = searchParams.get('type');
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    courseId: "",
    programName: programFromUrl || "",
  });

  // Generate unique transaction reference
  const generateTxRef = () => {
    return `GNI-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  const [txRef] = useState(generateTxRef());

  // Get the monthly price for the selected course (defaults to 0 if not set)
  const courseMonthlyPrice = selectedCourse?.monthly_price ?? 0;
  

  // Calculate discounted price
  const calculateDiscountedPrice = (originalPrice: number) => {
    if (!appliedCoupon) return originalPrice;
    
    if (appliedCoupon.discount_type === "percentage") {
      return originalPrice * (1 - appliedCoupon.discount_value / 100);
    } else {
      return Math.max(0, originalPrice - appliedCoupon.discount_value);
    }
  };

  const discountedPriceUSD = calculateDiscountedPrice(courseMonthlyPrice);
  const discountAmount = courseMonthlyPrice - discountedPriceUSD;
  
  // Convert price to selected currency
  const convertPrice = (priceUSD: number) => {
    return Math.round(priceUSD * CURRENCY_CONFIG[selectedCurrency].rate);
  };
  
  const displayPrice = convertPrice(discountedPriceUSD);
  const currencySymbol = CURRENCY_CONFIG[selectedCurrency].symbol;

  // Flutterwave configuration - use selected currency
  const flutterwaveConfig = {
    public_key: FLUTTERWAVE_PUBLIC_KEY,
    tx_ref: txRef,
    amount: displayPrice,
    currency: selectedCurrency,
    payment_options: selectedCurrency === "RWF" ? "mobilemoney,card" : "card,mobilemoney,ussd",
    customer: {
      email: formData.email,
      phone_number: formData.phone,
      name: `${formData.firstName} ${formData.lastName}`,
    },
    customizations: {
      title: "Global Nexus Institute",
      description: `Monthly subscription for ${programFromUrl || selectedCourse?.title || "Course Access"}`,
      logo: "https://hapixvzfcnawjlttkjtr.supabase.co/storage/v1/object/public/avatars/gni-logo.png",
    },
  };

  const handleFlutterPayment = useFlutterwave(flutterwaveConfig);

  useEffect(() => {
    checkUserAndFetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setFormData(prev => ({
          ...prev,
          email: session.user.email || ""
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Pre-select course if courseId is in URL params
    const courseIdFromUrl = searchParams.get('courseId');
    if (courseIdFromUrl && courses.length > 0) {
      const course = courses.find(c => c.id === courseIdFromUrl);
      if (course) {
        setFormData(prev => ({ ...prev, courseId: courseIdFromUrl }));
        setSelectedCourse(course);
      }
    }
  }, [searchParams, courses]);

  const checkUserAndFetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      const redirectUrl = programFromUrl 
        ? `/apply?program=${encodeURIComponent(programFromUrl)}${programType ? `&type=${programType}` : ''}`
        : '/apply';
      toast({
        title: "Login Required",
        description: "Please login or create an account to enroll",
      });
      navigate(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }
    
    setUser(session.user);
    setFormData(prev => ({
      ...prev,
      email: session.user.email || ""
    }));

    // Fetch user profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      const nameParts = profile.full_name?.split(" ") || [];
      setFormData(prev => ({
        ...prev,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        phone: profile.phone || "",
      }));
    }

    await fetchCourses();
  };

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, school, price, monthly_price, description, duration")
      .eq("approval_status", "approved")
      .order("title");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    if (field === "courseId") {
      const course = courses.find(c => c.id === value);
      setSelectedCourse(course || null);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // If using database course, check enrollment
    if (formData.courseId && user) {
      const { data: existingEnrollment } = await supabase
        .from("enrollments")
        .select("id, payment_status")
        .eq("user_id", user.id)
        .eq("course_id", formData.courseId)
        .maybeSingle();

      if (existingEnrollment?.payment_status === "completed") {
        toast({
          title: "Already Enrolled",
          description: "You are already enrolled in this course.",
        });
        navigate(`/course/${formData.courseId}`);
        return;
      }
    }

    // Must have either a course selected or a program name
    if (!formData.courseId && !formData.programName) {
      toast({
        title: "Missing Information",
        description: "Please select a program or course.",
        variant: "destructive",
      });
      return;
    }

    setStep(2);
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }

    setValidatingCoupon(true);
    try {
      // Query coupon by code
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!coupon) {
        toast({
          title: "Invalid Coupon",
          description: "This coupon code is not valid",
          variant: "destructive",
        });
        return;
      }

      // Check if expired
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        toast({
          title: "Coupon Expired",
          description: "This coupon has expired",
          variant: "destructive",
        });
        return;
      }

      // Check max uses
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        toast({
          title: "Coupon Limit Reached",
          description: "This coupon has reached its maximum usage limit",
          variant: "destructive",
        });
        return;
      }

      // Check if coupon applies to this course
      if (!coupon.is_global && coupon.course_id !== formData.courseId) {
        toast({
          title: "Coupon Not Applicable",
          description: "This coupon cannot be applied to the selected course",
          variant: "destructive",
        });
        return;
      }

      // Check if user already used this coupon
      if (user) {
        const { data: existingUsage } = await supabase
          .from("coupon_usages")
          .select("id")
          .eq("coupon_id", coupon.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingUsage) {
          toast({
            title: "Coupon Already Used",
            description: "You have already used this coupon",
            variant: "destructive",
          });
          return;
        }
      }

      setAppliedCoupon({
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type as "percentage" | "amount",
        discount_value: coupon.discount_value,
      });

      toast({
        title: "Coupon Applied!",
        description: coupon.discount_type === "percentage" 
          ? `${coupon.discount_value}% discount applied`
          : `$${coupon.discount_value} discount applied`,
      });
    } catch (error) {
      console.error("Error validating coupon:", error);
      toast({
        title: "Error",
        description: "Failed to validate coupon",
        variant: "destructive",
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast({ title: "Coupon removed" });
  };

  const verifyPaymentAndUpdateEnrollment = useCallback(async (transactionId: string, enrollId: string) => {
    try {
      console.log("Verifying payment with backend...", { transactionId, enrollId, txRef });
      
      const { data, error } = await supabase.functions.invoke("verify-flutterwave-payment", {
        body: {
          transaction_id: transactionId,
          tx_ref: txRef,
          enrollment_id: enrollId,
          coupon_id: appliedCoupon?.id || null,
          discount_applied: appliedCoupon ? discountAmount : 0,
        },
      });

      if (error) {
        console.error("Payment verification error:", error);
        throw new Error(error.message || "Payment verification failed");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Payment verification failed");
      }

      console.log("Payment verified successfully:", data);
      return true;
    } catch (error) {
      console.error("Error verifying payment:", error);
      throw error;
    }
  }, [txRef, appliedCoupon, discountAmount]);

  const handlePayment = async () => {
    if (!user) return;
    
    setProcessing(true);

    try {
      // Update profile first
      await supabase
        .from("profiles")
        .update({
          full_name: `${formData.firstName} ${formData.lastName}`,
          phone: formData.phone,
        })
        .eq("id", user.id);

      // Create enrollment if we have a database course
      if (formData.courseId && selectedCourse) {
        // Check for existing enrollment
        const { data: existingEnrollment } = await supabase
          .from("enrollments")
          .select("id, payment_status")
          .eq("user_id", user.id)
          .eq("course_id", selectedCourse.id)
          .maybeSingle();

        if (existingEnrollment?.payment_status === "completed") {
          toast({
            title: "Already Enrolled",
            description: "You are already enrolled in this course.",
          });
          navigate(`/course/${selectedCourse.id}`);
          setProcessing(false);
          return;
        }

        // For free courses (original price = 0 OR 100% coupon discount)
        if (discountedPriceUSD === 0) {
          let enrollmentIdForCoupon: string | null = null;
          
          if (existingEnrollment) {
            // Update existing pending enrollment to completed
            const { error: updateError } = await supabase
              .from("enrollments")
              .update({
                payment_status: "completed",
                amount_paid: 0,
              })
              .eq("id", existingEnrollment.id);

            if (updateError) {
              console.error("Failed to update enrollment:", updateError);
              toast({
                title: "Error",
                description: "Failed to complete enrollment. Please try again.",
                variant: "destructive",
              });
              setProcessing(false);
              return;
            }
            enrollmentIdForCoupon = existingEnrollment.id;
          } else {
            // Create new completed enrollment for free course
            const { data: newEnrollment, error: enrollError } = await supabase
              .from("enrollments")
              .insert({
                user_id: user.id,
                course_id: selectedCourse.id,
                payment_status: "completed",
                amount_paid: 0,
              })
              .select("id")
              .single();

            if (enrollError) {
              console.error("Failed to create enrollment:", enrollError);
              toast({
                title: "Error",
                description: "Failed to complete enrollment. Please try again.",
                variant: "destructive",
              });
              setProcessing(false);
              return;
            }
            enrollmentIdForCoupon = newEnrollment.id;
          }

          // Record coupon usage if a coupon was applied
          if (appliedCoupon && enrollmentIdForCoupon) {
            // Record coupon usage
            await supabase.from("coupon_usages").insert({
              coupon_id: appliedCoupon.id,
              user_id: user.id,
              enrollment_id: enrollmentIdForCoupon,
              discount_applied: discountAmount,
            });

            // Get current usage count and increment
            const { data: currentCoupon } = await supabase
              .from("coupons")
              .select("current_uses")
              .eq("id", appliedCoupon.id)
              .single();

            if (currentCoupon) {
              await supabase
                .from("coupons")
                .update({ current_uses: (currentCoupon.current_uses || 0) + 1 })
                .eq("id", appliedCoupon.id);
            }
          }

          // Success - go to confirmation step
          setStep(3);
          toast({
            title: "Enrollment Successful!",
            description: appliedCoupon 
              ? "Coupon applied! You have been enrolled for free." 
              : "You have been enrolled in the course for free.",
          });
          setProcessing(false);
          return;
        }

        // For paid courses, continue with payment flow
        let currentEnrollmentId: string | null = null;

        if (existingEnrollment) {
          currentEnrollmentId = existingEnrollment.id;
        } else {
          // Create new pending enrollment
          const { data: newEnrollment, error: enrollError } = await supabase
            .from("enrollments")
            .insert({
              user_id: user.id,
              course_id: selectedCourse.id,
              payment_status: "pending",
              amount_paid: 0,
            })
            .select("id")
            .single();

          if (enrollError) {
            console.error("Failed to create enrollment:", enrollError);
            toast({
              title: "Error",
              description: "Failed to initiate enrollment. Please try again.",
              variant: "destructive",
            });
            setProcessing(false);
            return;
          }
          currentEnrollmentId = newEnrollment.id;
        }
        
        setEnrollmentId(currentEnrollmentId);

        // Initiate Flutterwave payment
        handleFlutterPayment({
          callback: async (response) => {
            console.log("Flutterwave payment response:", response);
            closePaymentModal();

            if (response.status === "successful" || response.status === "completed") {
              try {
                if (currentEnrollmentId) {
                  // Verify payment on backend
                  await verifyPaymentAndUpdateEnrollment(
                    String(response.transaction_id),
                    currentEnrollmentId
                  );
                }
                
                setStep(3);
                toast({
                  title: "Payment Successful! 🎉",
                  description: "Your access has been granted immediately. Start learning now!",
                });
              } catch (error) {
                console.error("Payment verification failed:", error);
                toast({
                  title: "Payment Verification Issue",
                  description: "Payment received but verification pending. Please contact support if access is not granted.",
                  variant: "destructive",
                });
              }
            } else {
              toast({
                title: "Payment Cancelled",
                description: "Your payment was not completed.",
                variant: "destructive",
              });
            }
            setProcessing(false);
          },
          onClose: () => {
            console.log("Payment modal closed");
            setProcessing(false);
          },
        });
      } else {
        // No course selected, just show success for program enrollment
        setStep(3);
        toast({
          title: "Application Submitted!",
          description: "Your application has been received.",
        });
        setProcessing(false);
      }
    } catch (error) {
      console.error("Enrollment error:", error);
      toast({
        title: "Error",
        description: "Failed to complete enrollment. Please try again.",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  // Group courses by school
  const coursesBySchool = courses.reduce((acc, course) => {
    if (!acc[course.school]) {
      acc[course.school] = [];
    }
    acc[course.school].push(course);
    return acc;
  }, {} as Record<string, Course[]>);

  // Get program type label
  const getProgramTypeLabel = () => {
    switch (programType) {
      case 'nano-diploma': return 'Nano-Diploma';
      case 'diploma': return 'Diploma';
      case 'masterclass': return 'Masterclass';
      default: return 'Program';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              {programFromUrl ? `Enroll in ${programFromUrl}` : 'Apply to Global Nexus Institute'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {programFromUrl 
                ? `Complete your enrollment for the ${getProgramTypeLabel()} program`
                : 'Start your journey towards excellence'
              }
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-between mb-12">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`flex items-center ${num !== 3 ? "flex-1" : ""}`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    step >= num
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > num ? <CheckCircle className="w-6 h-6" /> : num}
                </div>
                {num !== 3 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      step > num ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Application Form */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>
                  Please provide your details to complete enrollment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitApplication} className="space-y-6">
                  {/* Show selected program if from URL */}
                  {programFromUrl && (
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{getProgramTypeLabel()}</p>
                          <p className="font-semibold text-lg">{programFromUrl}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">${courseMonthlyPrice}/month</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) =>
                          handleInputChange("firstName", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) =>
                          handleInputChange("lastName", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email is linked to your account
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                    />
                  </div>

                  {/* Show course selector only if no program from URL */}
                  {!programFromUrl && (
                    <div className="space-y-2">
                      <Label htmlFor="course">Select Course *</Label>
                      <Select
                        value={formData.courseId}
                        onValueChange={(value) =>
                          handleInputChange("courseId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a course" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(coursesBySchool).map(([school, schoolCourses]) => (
                            <div key={school}>
                              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                {school}
                              </div>
                              {schoolCourses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course.title} - ${course.monthly_price ?? 0}/month
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedCourse && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="font-medium">{selectedCourse.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedCourse.description}
                          </p>
                          {selectedCourse.duration && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Duration: {selectedCourse.duration}
                            </p>
                          )}
                          <p className="text-sm font-medium text-primary mt-1">
                            Monthly Price: ${courseMonthlyPrice}/month
                          </p>
                        </div>
                      )}
                      {courses.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          No courses available at this time. Please check back later.
                        </p>
                      )}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={!programFromUrl && courses.length === 0}
                  >
                    {courseMonthlyPrice === 0 ? "Complete Free Enrollment" : "Click here to Pay"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Payment/Confirmation */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {courseMonthlyPrice === 0 ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      Confirm Free Enrollment
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-6 h-6" />
                      Payment Information
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {courseMonthlyPrice === 0 
                    ? "Complete your free enrollment" 
                    : "Complete your monthly subscription payment via Flutterwave"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {courseMonthlyPrice === 0 
                      ? "No payment required - enjoy free access to this course" 
                      : "Complete your monthly subscription payment to access this course"
                    }
                  </p>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm">
                      <span className="font-medium">Program:</span> {programFromUrl || selectedCourse?.title}
                    </p>
                    {programType && (
                      <p className="text-sm">
                        <span className="font-medium">Type:</span> {getProgramTypeLabel()}
                      </p>
                    )}
                    {selectedCourse && (
                      <p className="text-sm">
                        <span className="font-medium">School:</span> {selectedCourse.school}
                      </p>
                    )}
                  </div>
                </div>

                {/* Coupon Section - only show for paid courses */}
                {courseMonthlyPrice > 0 && (
                  <div className="mb-6 p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-5 h-5 text-primary" />
                      <span className="font-medium">Have a coupon code?</span>
                    </div>
                    
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div>
                          <p className="font-medium text-green-700 dark:text-green-300">
                            Coupon applied: {appliedCoupon.code}
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            {appliedCoupon.discount_type === "percentage" 
                              ? `${appliedCoupon.discount_value}% off`
                              : `$${appliedCoupon.discount_value} off`
                            }
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeCoupon}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={validateCoupon}
                          disabled={validatingCoupon}
                        >
                          {validatingCoupon ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Apply"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Currency Selector - only show for paid courses */}
                {courseMonthlyPrice > 0 && (
                  <div className="mb-6 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Payment Currency</Label>
                        <p className="text-xs text-muted-foreground">Choose your preferred currency</p>
                      </div>
                      <Select
                        value={selectedCurrency}
                        onValueChange={(value: "USD" | "RWF") => setSelectedCurrency(value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                          <SelectItem value="RWF">RWF (Rwandan Franc)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedCurrency === "RWF" && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Rate: 1 USD ≈ {CURRENCY_CONFIG.RWF.rate.toLocaleString()} RWF
                      </p>
                    )}
                  </div>
                )}

                {/* Price Summary */}
                {courseMonthlyPrice > 0 && (
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-3">Order Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Monthly Subscription</span>
                        <span>{currencySymbol}{convertPrice(courseMonthlyPrice).toLocaleString()}</span>
                      </div>
                      {appliedCoupon && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount ({appliedCoupon.code})</span>
                          <span>-{currencySymbol}{convertPrice(discountAmount).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total</span>
                        <span>{currencySymbol}{displayPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Secure info */}
                <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="font-medium text-primary">
                      {courseMonthlyPrice === 0 ? "Instant Access" : "Secure Payment"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {courseMonthlyPrice === 0 
                      ? "Click below to get instant access to your course. No credit card required."
                      : "Your payment is processed securely through Flutterwave. We never store your card details."
                    }
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(1)}
                      disabled={processing}
                    >
                      Back
                    </Button>
                    <Button 
                      type="button" 
                      className="flex-1" 
                      onClick={handlePayment}
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : discountedPriceUSD === 0 ? (
                        "Complete Free Enrollment"
                      ) : (
                        `Pay ${currencySymbol}${displayPrice.toLocaleString()}`
                      )}
                    </Button>
                  </div>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    {courseMonthlyPrice === 0 
                      ? "By clicking, you agree to our Terms of Service."
                      : "By clicking \"Pay\", you agree to our Terms of Service and authorize the monthly charge."
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-4">
                  🎉 Enrollment Successful!
                </h2>
                <p className="text-muted-foreground text-lg mb-2">
                  Welcome to Global Nexus Institute
                </p>
                <p className="text-muted-foreground mb-4">
                  You are now enrolled in {programFromUrl || selectedCourse?.title}
                </p>
                <div className="bg-primary/10 p-3 rounded-lg mb-6 border border-primary/20">
                  <p className="text-primary font-medium">
                    ✅ Your access is ready! You can start learning immediately.
                  </p>
                </div>
                <div className="bg-muted p-6 rounded-lg mb-8">
                  <h3 className="font-semibold mb-4">What's Next:</h3>
                  <ul className="text-left space-y-2 text-muted-foreground">
                    <li>✓ Access your course materials in the LMS</li>
                    <li>✓ Start learning at your own pace</li>
                    <li>✓ Use the AI assistant for course support</li>
                    <li>✓ Complete assignments and quizzes</li>
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {selectedCourse ? (
                    <Button size="lg" onClick={() => navigate(`/course/${selectedCourse.id}`)}>
                      🚀 Start Learning Now
                    </Button>
                  ) : (
                    <Button onClick={() => navigate("/lms")}>
                      Go to Learning Portal
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => navigate("/lms")}>
                    Browse All Courses
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Apply;
