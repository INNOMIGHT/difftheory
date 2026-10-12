import {
    ExternalLink,
    ShieldCheck,
} from "lucide-react";

import {
    Link,
} from "react-router-dom";

import "./layout.css";


export default function Footer() {

    const currentYear =
        new Date().getFullYear();


    return (
        <footer className="app-footer">

            <div className="footer-main">

                <div className="footer-brand-block">

                    <div className="footer-product-label">
                        AN INNOMIGHT PRODUCT
                    </div>

                    <div className="footer-brand">
                        DIFF
                        <span>
                            THEORY
                        </span>
                    </div>

                    <p className="footer-tagline">
                        Beyond The Stats.
                    </p>

                </div>


                <div className="footer-links">

                    <Link to="/privacy">
                        Privacy Policy
                    </Link>

                    <Link to="/terms">
                        Terms of Service
                    </Link>

                    <a
                        href="https://innomight.com"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Innomight

                        <ExternalLink
                            size={11}
                        />
                    </a>

                </div>

            </div>


            <div className="footer-legal">

                <div className="footer-riot-notice">

                    <ShieldCheck
                        size={15}
                    />

                    <p>
                        DiffTheory isn't endorsed by Riot Games and
                        doesn't reflect the views or opinions of Riot
                        Games or anyone officially involved in producing
                        or managing Riot Games properties. Riot Games,
                        and all associated properties are trademarks or
                        registered trademarks of Riot Games, Inc.
                    </p>

                </div>


                <div className="footer-bottom">

                    <span>
                        © {currentYear} Innomight.
                        All rights reserved.
                    </span>

                    <span className="footer-dot">
                        •
                    </span>

                    <span>
                        DiffTheory analytics, scoring systems,
                        analysis logic, branding and original
                        content are proprietary to Innomight.
                    </span>

                </div>

            </div>

        </footer>
    );
}