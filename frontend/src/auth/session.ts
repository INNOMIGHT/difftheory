const ACCESS_TOKEN_KEY =
    "difftheory_beta_access_token";


export function getAccessToken():
    string | null {

    return localStorage.getItem(
        ACCESS_TOKEN_KEY,
    );
}


export function setAccessToken(
    token: string,
): void {

    localStorage.setItem(
        ACCESS_TOKEN_KEY,
        token,
    );
}


export function clearAccessToken():
    void {

    localStorage.removeItem(
        ACCESS_TOKEN_KEY,
    );
}


export function getAuthorizationHeaders():
    Record<string, string> {

    const token =
        getAccessToken();

    if (!token) {
        return {};
    }

    return {
        Authorization:
            `Bearer ${token}`,
    };
}