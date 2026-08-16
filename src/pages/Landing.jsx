import Header from "../components/Header";
import LandingHero from "../components/landing/LandingHero";
import ReviewUniverse from "../components/landing/ReviewUniverse";
import LiveModule from "../components/landing/LiveModule";
import HowItWorks from "../components/landing/HowItWorks";
import Roadmap from "../components/landing/Roadmap";
import LandingFooter from "../components/landing/LandingFooter";

export default function Landing() {
  return (
    <div className="landing-shell">
      <Header variant="landing" />
      <main>
        <LandingHero />
        <ReviewUniverse />
        <LiveModule />
        <HowItWorks />
        <Roadmap />
      </main>
      <LandingFooter />
    </div>
  );
}
