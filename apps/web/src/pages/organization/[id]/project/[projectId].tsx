import { ParsedUrlQuery } from 'querystring';

import { Components } from '../../../../components';
import { ssr } from '../../../../utils';

export interface IProps {
  params: ParsedUrlQuery;
  query: ParsedUrlQuery;
  locale: string;
  auth: {
    name: string;
    email: string;
    emailVerified: boolean;
    image: string;
    createdAt: string;
    updatedAt: string;
    id: string;
  };
}

const ProjectPage = (_props: IProps) => {
  return <Components.Views.Overview />;
};

ProjectPage.getLayout = Components.Layouts.Home;

export const getServerSideProps = ssr.getAuthMe;

export default ProjectPage;
