// src/hooks/useUsername.ts
// Hook to get username from Supabase session

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUsername() {
    const [username, setUsername] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsername = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                console.log("useUsername: Fetched user:", user);
                console.log("useUsername: user_metadata:", user?.user_metadata);

                if (user) {
                    // Try multiple possible fields for the username
                    const name = user.user_metadata?.username ||
                        user.user_metadata?.full_name ||
                        (user.user_metadata?.first_name && user.user_metadata?.last_name
                            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                            : null) ||
                        user.user_metadata?.first_name ||
                        user.email?.split("@")[0] ||
                        "User";
                    console.log("useUsername: Resolved name:", name);
                    setUsername(name);
                }
            } catch (error) {
                console.error("Error fetching username:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsername();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const name = session.user.user_metadata?.username ||
                    session.user.user_metadata?.full_name ||
                    session.user.email?.split("@")[0] ||
                    "User";
                setUsername(name);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return { username, loading, setUsername };
}

// Helper function to get username (for non-React contexts like utils.ts)
export async function getUsernameFromSession(): Promise<string> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            return user.user_metadata?.username ||
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "User";
        }
    } catch (error) {
        console.error("Error fetching username:", error);
    }
    return "User";
}
