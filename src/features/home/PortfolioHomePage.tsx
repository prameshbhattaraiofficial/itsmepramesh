import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { HeroSection } from '@/src/features/home/HeroSection';
import { AboutSection } from '@/src/features/about/AboutSection';
import { SkillsSection } from '@/src/features/skills/SkillsSection';
import { ExperienceSection } from '@/src/features/experience/ExperienceSection';
import { EducationSection } from '@/src/features/education/EducationSection';
import { AchievementsSection } from '@/src/features/achievements/AchievementsSection';
import { ProjectsSection } from '@/src/features/projects/ProjectsSection';
import { ServicesSection } from '@/src/features/services/ServicesSection';
import { BlogSection } from '@/src/features/blog/BlogSection';
import { TestimonialsSection } from '@/src/features/testimonials/TestimonialsSection';
import { ContactSection } from '@/src/features/contact/ContactSection';
import { Skeleton } from '@/src/components/ui/SwitchAndSkeleton';
import { Button } from '@/src/components/ui/Button';

export function PortfolioHomePage() {
  const location = useLocation();
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: portfolioApi.getProfile });
  const skillsQuery = useQuery({ queryKey: ['skills'], queryFn: portfolioApi.getSkills });
  const expQuery = useQuery({ queryKey: ['experiences'], queryFn: portfolioApi.getExperiences });
  const eduQuery = useQuery({ queryKey: ['education'], queryFn: portfolioApi.getEducation });
  const achQuery = useQuery({ queryKey: ['achievements'], queryFn: portfolioApi.getAchievements });
  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: portfolioApi.getServices });
  const testimonialsQuery = useQuery({ queryKey: ['testimonials'], queryFn: portfolioApi.getTestimonials });

  useEffect(() => {
    if (profileQuery.data?.seoTitle) {
      document.title = profileQuery.data.seoTitle;
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (!location.hash || !profileQuery.data) return;
    const timer = window.setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash, profileQuery.data, eduQuery.data, achQuery.data]);

  if (profileQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 space-y-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-14 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="lg:col-span-5 h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-28 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Unable to load portfolio data</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Please check that the portfolio API server is running and try again.
        </p>
        <Button className="mt-6" onClick={() => profileQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const profile = profileQuery.data;

  return (
    <>
      <HeroSection profile={profile} />
      <AboutSection profile={profile} />
      {skillsQuery.data ? <SkillsSection categories={skillsQuery.data} /> : null}
      {expQuery.data ? <ExperienceSection experiences={expQuery.data} /> : null}
      {eduQuery.data ? <EducationSection education={eduQuery.data.education} /> : null}
      {achQuery.data ? (
        <AchievementsSection
          achievements={achQuery.data.achievements}
          certifications={achQuery.data.certifications}
        />
      ) : null}
      <ProjectsSection />
      {servicesQuery.data ? <ServicesSection services={servicesQuery.data} /> : null}
      {profile.blogEnabled ? <BlogSection /> : null}
      {testimonialsQuery.data ? (
        <TestimonialsSection testimonials={testimonialsQuery.data} profile={profile} />
      ) : null}
      <ContactSection profile={profile} />
    </>
  );
}
