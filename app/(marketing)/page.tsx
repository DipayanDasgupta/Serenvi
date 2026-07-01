import Link from "next/link";

const features = [
  {
    title: "Premium Products",
    description:
      "Curated collection of fashion and lifestyle products that your customers will love.",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
  {
    title: "Smart Commissions",
    description:
      "Earn up to 25% on direct sales and commissions across 15 levels of your team.",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    title: "Achievement Rewards",
    description:
      "Unlock milestone bonuses as you grow. From Influencer to Global Icon, every rank rewards you.",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
        <path d="M18 2H6v7a6 6 0 1012 0V2z" />
      </svg>
    ),
  },
];

const steps = [
  {
    step: "01",
    title: "Join",
    description: "Sign up and become a Serenvi distributor. Get your unique referral code instantly.",
  },
  {
    step: "02",
    title: "Share",
    description: "Share premium products with your network. Build your team by inviting others.",
  },
  {
    step: "03",
    title: "Earn",
    description: "Earn commissions on every sale. Unlock achievement rewards as your team grows.",
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.1),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Build Your Empire with{" "}
            <span className="gradient-text">SERENVI</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Join the premium fashion and lifestyle network. Earn commissions across
            15 levels, unlock milestone rewards, and grow your business with
            products people love.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex items-center rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-background transition-colors hover:bg-accent/90"
            >
              Get Started
              <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center rounded-xl border border-border px-8 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-surface-2"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Everything you need to succeed
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Our platform gives you the tools, products, and support to build a
              thriving business.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass rounded-2xl p-8 transition-all duration-300 hover:border-accent/30"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              How it works
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Getting started is simple. Three steps to financial freedom.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                  <span className="gradient-text text-2xl font-bold">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Ready to start earning?
          </h2>
          <p className="mt-4 text-lg text-muted">
            Join thousands of distributors building their future with Serenvi.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-flex items-center rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-background transition-colors hover:bg-accent/90"
          >
            Join Now - It&apos;s Free
          </Link>
        </div>
      </section>
    </div>
  );
}
