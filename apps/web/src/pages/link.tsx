import { Components } from '../components';
import { ssr } from '../utils';

const LinkPage = () => {
  return <Components.Views.Link />;
};

LinkPage.getLayout = Components.Layouts.Auth;

export const getServerSideProps = ssr.getAuthMe;

export default LinkPage;
