// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			isAuthenticated: boolean;
			accessToken?: string;
			user: { role: string; email: string; uuid?: string; departmentId?: number } | null;
		}
		interface PageData {
			user?: { role: string; email: string; uuid?: string; departmentId?: number } | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
