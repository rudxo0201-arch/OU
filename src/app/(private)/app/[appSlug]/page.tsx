import { redirect } from 'next/navigation';

interface Props {
  params: { appSlug: string };
}

export default function AppPageRedirect({ params }: Props) {
  redirect(`/orb/${params.appSlug}`);
}
