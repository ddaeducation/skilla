import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Programs from "./pages/Programs";
import AllPrograms from "./pages/AllPrograms";
import Apply from "./pages/Apply";
import SchoolPrograms from "./pages/SchoolPrograms";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import LMS from "./pages/LMS";
import CourseDetail from "./pages/CourseDetail";
import AcceptInvite from "./pages/AcceptInvite";
import AcceptInstructorInvite from "./pages/AcceptInstructorInvite";
import Instructor from "./pages/Instructor";
import AcceptCourseInstructorInvite from "./pages/AcceptCourseInstructorInvite";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import BecomeInstructor from "./pages/BecomeInstructor";
import NotFound from "./pages/NotFound";
import NoteReader from "./components/NoteReader";
import CertificateVerify from "./pages/CertificateVerify";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/programs/all" element={<AllPrograms />} />
          <Route path="/programs/:type" element={<Programs />} />
          <Route path="/schools/:school" element={<SchoolPrograms />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/lms" element={<LMS />} />
          <Route path="/course/:courseId" element={<CourseDetail />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/accept-instructor-invite" element={<AcceptInstructorInvite />} />
          <Route path="/accept-course-instructor-invite" element={<AcceptCourseInstructorInvite />} />
          <Route path="/instructor" element={<Instructor />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/become-instructor" element={<BecomeInstructor />} />
          <Route path="/certificate/verify/:certNumber" element={<CertificateVerify />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <NoteReader />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
