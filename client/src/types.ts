export interface Variation {
    id: string;
    name: string;
    image: string | null;
    prompts: string[];
}

export interface Character {
    id: string;
    name: string;
    series: string;
    notes: string;
    basePrompts: string[];
    variations: Variation[];
    favoriteLists: string[];
    createdAt: string;
}
