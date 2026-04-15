import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodEffects<z.ZodString, string, string>;
        password: z.ZodString;
        displayName: z.ZodString;
        role: z.ZodDefault<z.ZodEnum<["keeper", "researcher"]>>;
    }, "strip", z.ZodTypeAny, {
        password: string;
        email: string;
        role: "keeper" | "researcher";
        displayName: string;
    }, {
        password: string;
        email: string;
        displayName: string;
        role?: "keeper" | "researcher" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        password: string;
        email: string;
        role: "keeper" | "researcher";
        displayName: string;
    };
}, {
    body: {
        password: string;
        email: string;
        displayName: string;
        role?: "keeper" | "researcher" | undefined;
    };
}>;
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
        email: string;
    }, {
        password: string;
        email: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        password: string;
        email: string;
    };
}, {
    body: {
        password: string;
        email: string;
    };
}>;
export declare const refreshSchema: z.ZodObject<{
    body: z.ZodObject<{
        refreshToken: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        refreshToken: string;
    }, {
        refreshToken: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        refreshToken: string;
    };
}, {
    body: {
        refreshToken: string;
    };
}>;
export declare const updateProfileSchema: z.ZodObject<{
    body: z.ZodEffects<z.ZodObject<{
        displayName: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        password?: string | undefined;
        displayName?: string | undefined;
    }, {
        password?: string | undefined;
        displayName?: string | undefined;
    }>, {
        password?: string | undefined;
        displayName?: string | undefined;
    }, {
        password?: string | undefined;
        displayName?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        password?: string | undefined;
        displayName?: string | undefined;
    };
}, {
    body: {
        password?: string | undefined;
        displayName?: string | undefined;
    };
}>;
export declare const updateRoleSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    body: z.ZodObject<{
        role: z.ZodEnum<["keeper", "researcher", "admin"]>;
    }, "strip", z.ZodTypeAny, {
        role: "keeper" | "researcher" | "admin";
    }, {
        role: "keeper" | "researcher" | "admin";
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
    };
    body: {
        role: "keeper" | "researcher" | "admin";
    };
}, {
    params: {
        id: string;
    };
    body: {
        role: "keeper" | "researcher" | "admin";
    };
}>;
//# sourceMappingURL=auth.validator.d.ts.map