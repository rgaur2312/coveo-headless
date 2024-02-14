import React from "react";
import { searchBox, popularViewed, urlManager } from "../headless/index";
import { PopularRecommendations } from "../components/popularRecommendations";
import { Header } from "../components/header";

export const HomePage: React.FC = () => {
  return (
    <>
      <Header searchBox={searchBox} urlManager={urlManager} />
      <div>
        Home Page
        <PopularRecommendations popularViewed={popularViewed} />
      </div>
    </>
  );
};

export default HomePage;
