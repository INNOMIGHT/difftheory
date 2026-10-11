import {
    ExternalLink,
} from "lucide-react";

import "./layout.css";


export default function Footer() {

    const currentYear =
        new Date().getFullYear();

    return (
        <footer className="app-footer">

            <div className="footer-left">

                <div className="footer-brand">
                    DIFF
                    <span>
                        THEORY
                    </span>
                </div>

                <span className="footer-divider">
                    /
                </span>

                <p>
                    A product by
                    {" "}
                    <strong>
                        INNOMIGHT
                    </strong>
                </p>

            </div>


            <div className="footer-right">

                <span>
                    Beyond The Stats
                </span>

                <span className="footer-dot">
                    •
                </span>

                <span>
                    © {currentYear} Innomight
                </span>

                <a
                    href="https://innomight.com"
                    target="_blank"
                    rel="noreferrer"
                >
                    innomight.com

                    <ExternalLink
                        size={11}
                    />
                </a>

            </div>

        </footer>
    );
}