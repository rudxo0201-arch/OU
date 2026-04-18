export interface Boncho {
  id: string;
  name: string;
  hanjaName: string;
  categoryMajor: string;
  categoryMinor: string;
  importance: number;
  channelTropism: string[];
  relatedHerbs: string[];
  nature?: string[];
  flavor?: string[];
  efficacy?: string[];
  indications?: string[];
  description?: string;
  starred?: boolean;
}
