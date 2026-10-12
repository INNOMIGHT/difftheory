import {
    ArrowLeft,
    Scale,
} from "lucide-react";

import {
    Link,
} from "react-router-dom";

import Footer
    from "../components/layout/Footer";

import "./LegalPage.css";


export default function TermsPage() {

    return (
        <div className="legal-page">

            <header className="legal-topbar">

                <Link
                    to="/"
                    className="legal-brand"
                >
                    DIFF
                    <span>
                        THEORY
                    </span>
                </Link>

                <Link
                    to="/"
                    className="legal-back"
                >
                    <ArrowLeft
                        size={14}
                    />

                    Back to DiffTheory
                </Link>

            </header>


            <main className="legal-shell">

                <div className="legal-heading">

                    <p>
                        LEGAL
                    </p>

                    <h1>
                        Terms of Service
                    </h1>

                    <span>
                        Effective: 12 October 2026
                    </span>

                </div>


                <section className="legal-intro">

                    <Scale
                        size={22}
                    />

                    <p>
                        These Terms govern your use of DiffTheory,
                        a League of Legends analytics and coaching
                        product developed and operated by Innomight.
                    </p>

                </section>


                <LegalSection
                    title="1. Using DiffTheory"
                >
                    <p>
                        You may use DiffTheory for lawful personal
                        gameplay analysis, coaching and performance
                        review purposes.
                    </p>

                    <p>
                        You must not misuse the service, interfere with
                        its operation, attempt to bypass access controls,
                        abuse Riot Games APIs through DiffTheory or use
                        the service in violation of applicable law or
                        Riot Games policies.
                    </p>
                </LegalSection>


                <LegalSection
                    title="2. Beta service"
                >
                    <p>
                        DiffTheory may currently be provided as a beta
                        or pre-release service. Features may change,
                        become unavailable or produce incomplete results
                        while the product is being developed.
                    </p>

                    <p>
                        Beta access does not guarantee continued access
                        to any particular feature or service.
                    </p>
                </LegalSection>


                <LegalSection
                    title="3. Gameplay analysis"
                >
                    <p>
                        DiffTheory provides analytical and coaching
                        information derived from gameplay data and
                        proprietary analysis systems.
                    </p>

                    <p>
                        DiffTheory's scores, recommendations, rank
                        readiness indicators, priority scores and other
                        outputs are analytical estimates and coaching
                        tools. They are not Riot Games MMR, LP,
                        matchmaking ratings or promotion probabilities.
                    </p>

                    <p>
                        DiffTheory does not guarantee that following any
                        recommendation will result in wins, rank
                        progression or any particular gameplay outcome.
                    </p>
                </LegalSection>


                <LegalSection
                    title="4. Intellectual property"
                >
                    <p>
                        Except for Riot Games materials and other
                        third-party content, DiffTheory's original
                        software, analytical systems, scoring methods,
                        analysis logic, user interface, visual design,
                        branding, written content and other original
                        materials are owned by or licensed to Innomight.
                    </p>

                    <p>
                        You may use the service for its intended
                        purpose, but you may not reproduce, republish,
                        commercially exploit, reverse engineer,
                        redistribute or create a substantially copied
                        service from proprietary DiffTheory materials
                        except where applicable law expressly permits
                        such activity.
                    </p>
                </LegalSection>


                <LegalSection
                    title="5. Riot Games intellectual property"
                >
                    <p>
                        Riot Games, League of Legends and associated
                        properties, trademarks and game materials are
                        owned by Riot Games and its applicable
                        licensors. Innomight does not claim ownership
                        over Riot Games intellectual property.
                    </p>
                </LegalSection>


                <LegalSection
                    title="6. No Riot endorsement"
                >
                    <p>
                        DiffTheory is an independent third-party
                        product. Registration of the product, access to
                        Riot APIs or issuance of Riot API credentials
                        does not constitute endorsement, sponsorship,
                        certification or approval by Riot Games.
                    </p>
                </LegalSection>


                <LegalSection
                    title="7. Availability"
                >
                    <p>
                        We may modify, suspend, restrict or discontinue
                        all or part of DiffTheory where reasonably
                        necessary for development, maintenance, legal,
                        security, infrastructure or operational
                        reasons.
                    </p>
                </LegalSection>


                <LegalSection
                    title="8. Acceptable use"
                >
                    <p>
                        You must not use DiffTheory to cheat, interfere
                        with League of Legends, obtain an unfair
                        real-time advantage, attack other systems,
                        access another user's protected DiffTheory data
                        or engage in automated abuse of the service.
                    </p>
                </LegalSection>


                <LegalSection
                    title="9. Disclaimer"
                >
                    <p>
                        DiffTheory is provided on an "as available"
                        basis. To the extent permitted by applicable
                        law, Innomight does not warrant that the service
                        will always be uninterrupted, error-free,
                        complete or suitable for a particular
                        competitive outcome.
                    </p>
                </LegalSection>


                <LegalSection
                    title="10. Limitation of liability"
                >
                    <p>
                        To the extent permitted by applicable law,
                        Innomight will not be liable for indirect,
                        incidental, special or consequential losses
                        arising solely from reliance on analytical
                        recommendations, temporary service
                        unavailability or third-party service failures.
                    </p>
                </LegalSection>


                <LegalSection
                    title="11. Suspension and termination"
                >
                    <p>
                        Access may be suspended or terminated where
                        necessary to address abuse, security risks,
                        violations of these Terms or legal and platform
                        requirements.
                    </p>
                </LegalSection>


                <LegalSection
                    title="12. Changes"
                >
                    <p>
                        These Terms may be updated as DiffTheory
                        evolves. Continued use after updated Terms
                        become effective constitutes acceptance to the
                        extent permitted by applicable law.
                    </p>
                </LegalSection>


                <LegalSection
                    title="13. Contact"
                >
                    <p>
                        DiffTheory is an Innomight product. Questions
                        relating to these Terms may be submitted through
                        Innomight's official website at innomight.com.
                    </p>
                </LegalSection>


                <section className="legal-riot-notice">

                    <strong>
                        Riot Games Notice
                    </strong>

                    <p>
                        DiffTheory isn't endorsed by Riot Games and
                        doesn't reflect the views or opinions of Riot
                        Games or anyone officially involved in
                        producing or managing Riot Games properties.
                        Riot Games, and all associated properties are
                        trademarks or registered trademarks of Riot
                        Games, Inc.
                    </p>

                </section>

            </main>


            <Footer />

        </div>
    );
}


function LegalSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {

    return (
        <section className="legal-section">

            <h2>
                {title}
            </h2>

            <div>
                {children}
            </div>

        </section>
    );
}