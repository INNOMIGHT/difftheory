import {
    ArrowRight,
    CheckCircle2,
    LoaderCircle,
    ScanSearch,
    ShieldCheck,
} from "lucide-react";

import {
    useState,
} from "react";

import type {
    FormEvent,
} from "react";

import {
    Link,
    Navigate,
    useNavigate,
} from "react-router-dom";

import {
    useAuth,
} from "../auth/AuthContext";

import type {
    ConnectStage,
} from "../auth/AuthContext";

import "./ConnectPage.css";


const PLATFORMS = [
    {
        value: "EUW1",
        label: "Europe West",
    },
    {
        value: "EUN1",
        label: "Europe Nordic & East",
    },
    {
        value: "NA1",
        label: "North America",
    },
    {
        value: "KR",
        label: "Korea",
    },
    {
        value: "JP1",
        label: "Japan",
    },
    {
        value: "BR1",
        label: "Brazil",
    },
    {
        value: "LA1",
        label: "Latin America North",
    },
    {
        value: "LA2",
        label: "Latin America South",
    },
    {
        value: "OC1",
        label: "Oceania",
    },
    {
        value: "TR1",
        label: "Turkey",
    },
    {
        value: "ME1",
        label: "Middle East",
    },
    {
        value: "SG2",
        label: "Singapore",
    },
    {
        value: "PH2",
        label: "Philippines",
    },
    {
        value: "TW2",
        label: "Taiwan",
    },
    {
        value: "VN2",
        label: "Vietnam",
    },
    {
        value: "TH2",
        label: "Thailand",
    },
];


export default function ConnectPage() {

    const navigate =
        useNavigate();

    const {
        connect,
        isAuthenticated,
    } = useAuth();

    const [
        riotId,
        setRiotId,
    ] = useState(
        "",
    );

    const [
        platform,
        setPlatform,
    ] = useState(
        "EUW1",
    );

    const [
        stage,
        setStage,
    ] = useState<
        ConnectStage | null
    >(
        null,
    );

    const [
        error,
        setError,
    ] = useState<
        string | null
    >(
        null,
    );


    if (
        isAuthenticated
        && !stage
    ) {
        return (
            <Navigate
                to="/"
                replace
            />
        );
    }


    async function handleSubmit(
        event: FormEvent,
    ) {

        event.preventDefault();

        setError(
            null,
        );


        const separatorIndex =
            riotId.lastIndexOf(
                "#",
            );

        if (
            separatorIndex <= 0
            || separatorIndex
                === riotId.length - 1
        ) {
            setError(
                "Enter your Riot ID as GameName#TagLine.",
            );

            return;
        }


        const gameName =
            riotId
                .slice(
                    0,
                    separatorIndex,
                )
                .trim();

        const tagLine =
            riotId
                .slice(
                    separatorIndex + 1,
                )
                .trim();


        try {

            await connect(
                gameName,
                tagLine,
                platform,
                setStage,
            );

            navigate(
                "/",
                {
                    replace:
                        true,
                },
            );
        }
        catch (
            err
        ) {

            setStage(
                null,
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "DiffTheory could not connect this Riot account.",
            );
        }
    }


    const busy =
        stage !== null;


    return (
        <main className="connect-page">

            <div className="connect-background-grid" />


            <section className="connect-brand">

                <div className="connect-logo">
                    DT
                </div>

                <div>
                    <strong>
                        DIFF
                        <span>
                            THEORY
                        </span>
                    </strong>

                    <p>
                        BEYOND THE STATS
                    </p>
                </div>

            </section>


            <section className="connect-shell">

                <div className="connect-copy">

                    <p className="connect-eyebrow">
                        DIFFTHEORY BETA
                    </p>

                    <h1>
                        Your games already
                        told the story.
                        <span>
                            Let's read it.
                        </span>
                    </h1>

                    <p className="connect-description">
                        Connect your Riot ID and DiffTheory will
                        analyse your latest ranked games, find
                        recurring patterns and build your first
                        coaching verdict.
                    </p>


                    <div className="connect-feature">

                        <ScanSearch
                            size={20}
                        />

                        <div>
                            <strong>
                                10 recent ranked games
                            </strong>

                            <span>
                                Match timelines, decisions,
                                economy and fight context.
                            </span>
                        </div>

                    </div>


                    <div className="connect-feature">

                        <ShieldCheck
                            size={20}
                        />

                        <div>
                            <strong>
                                No Riot password
                            </strong>

                            <span>
                                DiffTheory only needs your public
                                Riot ID during the beta.
                            </span>
                        </div>

                    </div>

                </div>


                <div className="connect-card">

                    {
                        busy
                            ? (
                                <OnboardingProgress
                                    stage={
                                        stage
                                    }
                                />
                            )
                            : (
                                <form
                                    onSubmit={
                                        handleSubmit
                                    }
                                >

                                    <p>
                                        CONNECT YOUR ACCOUNT
                                    </p>

                                    <h2>
                                        Enter the Rift.
                                    </h2>

                                    <label>
                                        RIOT ID

                                        <input
                                            type="text"
                                            value={
                                                riotId
                                            }
                                            onChange={
                                                (
                                                    event,
                                                ) =>
                                                    setRiotId(
                                                        event.target.value,
                                                    )
                                            }
                                            placeholder="Innomight#Dream"
                                            autoComplete="off"
                                            autoFocus
                                        />
                                    </label>


                                    <label>
                                        LEAGUE SERVER

                                        <select
                                            value={
                                                platform
                                            }
                                            onChange={
                                                (
                                                    event,
                                                ) =>
                                                    setPlatform(
                                                        event.target.value,
                                                    )
                                            }
                                        >

                                            {
                                                PLATFORMS.map(
                                                    (
                                                        item,
                                                    ) => (
                                                        <option
                                                            key={
                                                                item.value
                                                            }
                                                            value={
                                                                item.value
                                                            }
                                                        >
                                                            {
                                                                item.label
                                                            }
                                                        </option>
                                                    ),
                                                )
                                            }

                                        </select>
                                    </label>


                                    {
                                        error
                                        && (
                                            <div className="connect-error">
                                                {error}
                                            </div>
                                        )
                                    }


                                    <button
                                        type="submit"
                                        className="connect-submit"
                                    >
                                        START JUDGEMENT

                                        <ArrowRight
                                            size={17}
                                        />
                                    </button>


                                    <small className="connect-beta-note">
                                        Beta access does not verify Riot-account
                                        ownership. Riot Sign On will replace this
                                        connection method after approval.
                                    </small>

                                </form>
                            )
                    }

                </div>

            </section>

            <footer className="connect-footer">

    <div className="connect-footer-brand">

        <span>
            AN
        </span>

        <strong>
            INNOMIGHT
        </strong>

        <span>
            PRODUCT
        </span>

    </div>


    <div className="connect-footer-links">

        <Link
            to="/privacy"
        >
            Privacy Policy
        </Link>

        <span>
            •
        </span>

        <Link
            to="/terms"
        >
            Terms of Service
        </Link>

        <span>
            •
        </span>

        <a
            href="https://innomight.com"
            target="_blank"
            rel="noreferrer"
        >
            Innomight
        </a>

    </div>


    <p className="connect-footer-riot">
        DiffTheory isn't endorsed by Riot Games and
        doesn't reflect the views or opinions of Riot
        Games or anyone officially involved in producing
        or managing Riot Games properties. Riot Games,
        and all associated properties are trademarks or
        registered trademarks of Riot Games, Inc.
    </p>

</footer>

        </main>
    );
}


function OnboardingProgress({
    stage,
}: {
    stage: ConnectStage;
}) {

    const analysing =
        stage === "analysing";


    return (
        <div className="connect-progress">

            <LoaderCircle
                className="spin connect-progress-loader"
                size={38}
            />

            <p>
                DIFFTHEORY IS WORKING
            </p>

            <h2>
                {
                    analysing
                        ? "Analysing your games"
                        : "Finding your Riot account"
                }
            </h2>

            <div className="connect-progress-list">

                <div
                    className={
                        `connect-progress-step ${
                            analysing
                                ? "complete"
                                : "active"
                        }`
                    }
                >
                    {
                        analysing
                            ? (
                                <CheckCircle2
                                    size={17}
                                />
                            )
                            : (
                                <LoaderCircle
                                    className="spin"
                                    size={17}
                                />
                            )
                    }

                    Riot account found
                </div>


                <div
                    className={
                        `connect-progress-step ${
                            analysing
                                ? "active"
                                : ""
                        }`
                    }
                >
                    {
                        analysing
                        && (
                            <LoaderCircle
                                className="spin"
                                size={17}
                            />
                        )
                    }

                    Analysing latest 10 ranked games
                </div>


                <div className="connect-progress-step">
                    Building your coaching profile
                </div>

            </div>

        </div>
    );
}