declare module '@/app/page' {
  import { ComponentType } from 'react';
  
  export interface HomePageProps {
    simulateError?: boolean;
  }
  
  const HomePage: ComponentType<HomePageProps>;
  export default HomePage;
}

declare module '@/utils/attestationHelpers'; 