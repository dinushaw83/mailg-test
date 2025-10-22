import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Slide,
  Box,
  Container,
  Grid,
  Paper,
  Divider,
  Button,
  FormGroup,
  FormControlLabel,
  Switch,
  Link,
  Checkbox,
  Chip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import ManageSearchOutlinedIcon from "@mui/icons-material/ManageSearchOutlined";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ManageHistoryOutlinedIcon from "@mui/icons-material/ManageHistoryOutlined";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import AddIcon from "@mui/icons-material/Add";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import BookmarkBorderOutlinedIcon from "@mui/icons-material/BookmarkBorderOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useGlobalContext } from "../../contexts/GlobalContext";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const NavItem = ({ icon: Icon, label, onClick, active }) => (
  <Button
    onClick={onClick}
    startIcon={<Icon />}
    sx={{
      justifyContent: "flex-start",
      textTransform: "none",
      color: active ? "#1a73e8" : "#5f6368",
      backgroundColor: active ? "rgba(26,115,232,0.08)" : "transparent",
      borderRadius: "999px 0 0 999px",
      width: "100%",
      pl: 2,
      pr: 1,
      py: 1,
      '&:hover': { backgroundColor: active ? "rgba(26,115,232,0.12)" : "rgba(0,0,0,0.04)" }
    }}
  >
    <Typography sx={{ display: { xs: 'none', md: 'block' } }}>{label}</Typography>
  </Button>
);

const ListRowButton = ({ icon: Icon, title, subtitle, status, onClick }) => (
  <Button onClick={onClick} sx={{
    display: 'flex', alignItems: 'flex-start', textTransform: 'none', color: '#202124',
    width: '100%', justifyContent: 'space-between', py: 2
  }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
      <Icon sx={{ color: '#1a73e8', mt: 0.5 }} />
      <Box sx={{ ml: 2, textAlign: 'left' }}>
        <Typography sx={{ fontSize: '1rem' }}>{title}</Typography>
        {subtitle && <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 0.5 }}>{subtitle}</Typography>}
        <Typography sx={{ color: '#1a73e8', fontSize: '0.875rem', mt: 0.5 }}>Manage settings</Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {status && <Typography sx={{ color: '#1a73e8', fontSize: '0.875rem', fontWeight: 600, mr: 1 }}>{status}</Typography>}
      <ChevronRightIcon sx={{ color: 'text.disabled' }} />
    </Box>
  </Button>
);

const Card = ({ children }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
    {children}
  </Paper>
);

const SectionHeader = ({ title, action }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
    <Typography sx={{ fontSize: '1.25rem', color: '#202124' }}>{title}</Typography>
    {action}
  </Box>
);

const CenterColumn = ({ children }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
    <Box sx={{ width: '100%', maxWidth: 880 }}>{children}</Box>
  </Box>
);

const OutlinedPanel = ({ children, sx }) => (
  <Paper variant="outlined" square sx={{ p: 3, borderRadius: 1, ...sx }}>
    {children}
  </Paper>
);

// History settings card to match reference layout
const HistorySettingsRow = ({ label, status, onClick, icon }) => (
  <Button onClick={onClick} sx={{
    justifyContent: 'space-between', textTransform: 'none', color: '#202124', width: '100%',
    py: 1.5, px: 1.5
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {icon}
      <Typography sx={{ fontSize: '0.95rem' }}>{label}</Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>{status}</Typography>
      <ChevronRightIcon sx={{ color: 'text.disabled' }} />
    </Box>
  </Button>
);

const HistorySettingsCard = ({ onOpenWebActivity, onOpenTimeline, onOpenStreamTube, webActivityStatus, timelineStatus, streamTubeStatus }) => (
  <Card>
    <Box sx={{ p: 2.5 }}>
      <Typography sx={{ fontSize: '1rem', mb: 0.5 }}>History settings</Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 2 }}>
        Choose whether to save the things you do and places you go to get more relevant results, personalized maps, recommendations, and more
      </Typography>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <HistorySettingsRow
          label="Web & App Activity"
          status={webActivityStatus}
          onClick={onOpenWebActivity}
          icon={<Box sx={{ width: 18, height: 18, borderRadius: '50%', background: webActivityStatus === 'On' ? '#1a73e8' : '#9aa0a6' }} />}
        />
        <Divider />
        <HistorySettingsRow
          label="Timeline"
          status={timelineStatus}
          onClick={onOpenTimeline}
          icon={<MapOutlinedIcon sx={{ color: timelineStatus === 'On' ? '#1a73e8' : '#5f6368' }} />}
        />
        <Divider />
        <HistorySettingsRow
          label="StreamTube History"
          status={streamTubeStatus}
          onClick={onOpenStreamTube}
          icon={<VideoLibraryOutlinedIcon sx={{ color: streamTubeStatus === 'On' ? '#1a73e8' : '#5f6368' }} />}
        />
      </Paper>
    </Box>
  </Card>
);

export default function PrivacyHub({ open, onClose, initialView = 'dataAndPrivacy' }) {
  const navigate = useNavigate();
  const { privacySettings, setPrivacySettings, mailGAccountPersonalInfo, setMailGAccountPersonalInfo, mailGAccountDataPrivacy, setMailGAccountDataPrivacy, thirdPartyApps, setThirdPartyApps, signInSettings, setSignInSettings } = useGlobalContext();
  const [activeView, setActiveView] = React.useState(initialView);
  const [editDialogOpen, setEditDialogOpen] = React.useState(null); // 'name', 'nickname', 'birthday', 'phone', 'gender', 'homeAddress', 'workAddress'
  const [editFormData, setEditFormData] = React.useState({});
  const [deleteAppDialog, setDeleteAppDialog] = React.useState(null); // stores app id to delete

  // Update activeView when initialView changes and dialog opens
  React.useEffect(() => {
    if (open) {
      setActiveView(initialView);
    }
  }, [open, initialView]);

  // Function to handle navigation with URL update
  const handleNavigateToView = (view) => {
    setActiveView(view);
    // Convert camelCase to hyphenated URL
    const viewMap = {
      'personalInfo': 'personal-info',
      'dataAndPrivacy': 'data-privacy',
      'security': 'security',
      'storage': 'storage',
      'preferences': 'preferences',
    };
    const urlView = viewMap[view] || view;
    navigate(`/mailg-account/${urlView}`, { replace: true });
  };

  const toggle = (key) => (e) => setPrivacySettings({ ...privacySettings, [key]: e.target.checked });

  const handleOpenEdit = (field) => {
    if (field === 'name') {
      setEditFormData({ name: mailGAccountPersonalInfo.name });
    } else if (field === 'nickname') {
      setEditFormData({ nickname: mailGAccountPersonalInfo.nickname || '' });
    } else if (field === 'birthday') {
      setEditFormData({
        month: mailGAccountPersonalInfo.birthday.month,
        day: mailGAccountPersonalInfo.birthday.day,
        year: mailGAccountPersonalInfo.birthday.year,
        visibility: mailGAccountDataPrivacy.profileVisibility.birthdayVisibility,
      });
    } else if (field === 'phone') {
      setEditFormData({ phone: mailGAccountPersonalInfo.phone.number });
    } else if (field === 'gender') {
      setEditFormData({ gender: mailGAccountPersonalInfo.gender });
    } else if (field === 'homeAddress') {
      setEditFormData({ homeAddress: mailGAccountPersonalInfo.addresses.home || '' });
    } else if (field === 'workAddress') {
      setEditFormData({ workAddress: mailGAccountPersonalInfo.addresses.work || '' });
    } else if (field === 'email') {
      setEditFormData({ email: mailGAccountPersonalInfo.emails[0] || '' });
    }
    setEditDialogOpen(field);
  };

  const handleSaveEdit = () => {
    if (editDialogOpen === 'name') {
      setMailGAccountPersonalInfo({ ...mailGAccountPersonalInfo, name: editFormData.name });
    } else if (editDialogOpen === 'nickname') {
      setMailGAccountPersonalInfo({ ...mailGAccountPersonalInfo, nickname: editFormData.nickname });
    } else if (editDialogOpen === 'birthday' || editDialogOpen === 'updateBirthday') {
      setMailGAccountPersonalInfo({
        ...mailGAccountPersonalInfo,
        birthday: {
          month: editFormData.month,
          day: editFormData.day,
          year: editFormData.year,
          visibility: editFormData.visibility,
        },
      });
    } else if (editDialogOpen === 'phone') {
      setMailGAccountPersonalInfo({
        ...mailGAccountPersonalInfo,
        phone: { ...mailGAccountPersonalInfo.phone, number: editFormData.phone },
      });
    } else if (editDialogOpen === 'gender') {
      setMailGAccountPersonalInfo({ ...mailGAccountPersonalInfo, gender: editFormData.gender });
    } else if (editDialogOpen === 'homeAddress') {
      setMailGAccountPersonalInfo({
        ...mailGAccountPersonalInfo,
        addresses: { ...mailGAccountPersonalInfo.addresses, home: editFormData.homeAddress },
      });
    } else if (editDialogOpen === 'workAddress') {
      setMailGAccountPersonalInfo({
        ...mailGAccountPersonalInfo,
        addresses: { ...mailGAccountPersonalInfo.addresses, work: editFormData.workAddress },
      });
    } else if (editDialogOpen === 'email') {
      const updatedEmails = [...mailGAccountPersonalInfo.emails];
      updatedEmails[0] = editFormData.email;
      setMailGAccountPersonalInfo({ ...mailGAccountPersonalInfo, emails: updatedEmails });
    } else if (editDialogOpen === 'nameVisibility') {
      setMailGAccountDataPrivacy({
        ...mailGAccountDataPrivacy,
        profileVisibility: { ...mailGAccountDataPrivacy.profileVisibility, nameVisibility: editFormData.value },
      });
    } else if (editDialogOpen === 'genderVisibility') {
      setMailGAccountDataPrivacy({
        ...mailGAccountDataPrivacy,
        profileVisibility: { ...mailGAccountDataPrivacy.profileVisibility, genderVisibility: editFormData.value },
      });
    } else if (editDialogOpen === 'birthdayVisibility') {
      setMailGAccountDataPrivacy({
        ...mailGAccountDataPrivacy,
        profileVisibility: { ...mailGAccountDataPrivacy.profileVisibility, birthdayVisibility: editFormData.value },
      });
    } else if (editDialogOpen === 'emailVisibility') {
      setMailGAccountDataPrivacy({
        ...mailGAccountDataPrivacy,
        profileVisibility: { ...mailGAccountDataPrivacy.profileVisibility, emailVisibility: editFormData.value },
      });
    } else if (editDialogOpen === 'profilePictureVisibility') {
      setMailGAccountDataPrivacy({
        ...mailGAccountDataPrivacy,
        profileVisibility: { ...mailGAccountDataPrivacy.profileVisibility, profilePictureVisibility: editFormData.value },
      });
    } else if (editDialogOpen === 'linksVisibility') {
      setMailGAccountDataPrivacy({
        ...mailGAccountDataPrivacy,
        profileVisibility: { ...mailGAccountDataPrivacy.profileVisibility, linksVisibility: editFormData.value },
      });
    } else if (editDialogOpen === 'workVisibility') {
      setMailGAccountDataPrivacy({
        ...mailGAccountDataPrivacy,
        profileVisibility: { ...mailGAccountDataPrivacy.profileVisibility, workVisibility: editFormData.value },
      });
    } else if (editDialogOpen === 'educationVisibility') {
      setMailGAccountDataPrivacy({
        ...mailGAccountDataPrivacy,
        profileVisibility: { ...mailGAccountDataPrivacy.profileVisibility, educationVisibility: editFormData.value },
      });
    } else if (editDialogOpen === 'addAboutItem') {
      // Handle adding new about items (links, places, introduction, etc.)
      const { type, value } = editFormData;
      if (!value || !value.trim()) return; // Don't save empty values
      
      const updatedAbout = { ...mailGAccountPersonalInfo.about };
      
      if (type === 'link') {
        updatedAbout.links = [...updatedAbout.links, value.trim()];
      } else if (type === 'place') {
        updatedAbout.places = [...updatedAbout.places, value.trim()];
      } else if (type === 'profileLink') {
        updatedAbout.profileLinks = [...updatedAbout.profileLinks, value.trim()];
      } else if (type === 'contributorLink') {
        updatedAbout.contributorLinks = [...updatedAbout.contributorLinks, value.trim()];
      } else if (type === 'introduction') {
        updatedAbout.introduction = value.trim();
      }
      
      setMailGAccountPersonalInfo({
        ...mailGAccountPersonalInfo,
        about: updatedAbout,
      });
    } else if (editDialogOpen === 'addWorkEducationItem') {
      // Handle adding new work & education items
      const { type, value } = editFormData;
      if (!value || !value.trim()) return; // Don't save empty values
      
      const updatedWorkEducation = { ...mailGAccountPersonalInfo.workAndEducation };
      
      if (type === 'occupation') {
        updatedWorkEducation.occupation = value.trim();
      } else if (type === 'workHistory') {
        updatedWorkEducation.workHistory = [...updatedWorkEducation.workHistory, value.trim()];
      } else if (type === 'educationHistory') {
        updatedWorkEducation.educationHistory = [...updatedWorkEducation.educationHistory, value.trim()];
      }
      
      setMailGAccountPersonalInfo({
        ...mailGAccountPersonalInfo,
        workAndEducation: updatedWorkEducation,
      });
    }
    setEditDialogOpen(null);
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(null);
    setEditFormData({});
  };

  const isSubPage = activeView === 'webAndAppActivity' || activeView === 'locationHistoryControls' || activeView === 'streamTubeHistory' || activeView === 'searchPersonalizationControls' || activeView === 'myAdCenter' || activeView === 'thirdPartyApps' || activeView === 'aboutMe' || activeView === 'addMoreAboutYou' || activeView === 'addWorkEducation' || activeView === 'servicesDashboard' || activeView === 'locationSharing' || activeView === 'signInSettings';

  return (
    <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
      <AppBar elevation={0} sx={{ position: 'sticky', backgroundColor: '#fff', color: '#202124', borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar>
          {isSubPage && (
            <IconButton edge="start" color="inherit" onClick={() => setActiveView('dataAndPrivacy')} aria-label="back">
              <ChevronLeftIcon />
            </IconButton>
          )}
          <Typography sx={{ ml: isSubPage ? 0.5 : 1, flex: 1, fontSize: '1.125rem', fontWeight: 500, letterSpacing: 0.2 }}>
            MailG Account
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, backgroundColor: '#fff' }}>
        <Container maxWidth={false} sx={{ py: { xs: 2, md: 4 }, px: 0 }}>
          <Box sx={{ display: 'flex' }}>
            {/* Sidebar */}
            <Box sx={{ width: { xs: 0, md: 240 }, pr: { md: 2 }, pl: 0, display: { xs: 'none', md: isSubPage ? 'none' : 'block' }, ml: 0 }}>
              <NavItem icon={PersonOutlineOutlinedIcon} label="Personal info" active={activeView==='personalInfo'} onClick={() => handleNavigateToView('personalInfo')} />
              <NavItem icon={ShieldOutlinedIcon} label="Data & privacy" active={activeView==='dataAndPrivacy'} onClick={() => handleNavigateToView('dataAndPrivacy')} />
              <NavItem icon={SettingsOutlinedIcon} label="Security" active={activeView==='security'} onClick={() => handleNavigateToView('security')} />
              <NavItem icon={StorageOutlinedIcon} label="Storage" active={activeView==='storage'} onClick={() => handleNavigateToView('storage')} />
              <NavItem icon={ManageSearchOutlinedIcon} label="Preferences" active={activeView==='preferences'} onClick={() => handleNavigateToView('preferences')} />
            </Box>

            {/* Main */}
            <Box sx={{ flex: 1 }}>
              {activeView === 'dataAndPrivacy' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Data & privacy</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Key privacy options to help you choose the data saved in your account, the ads you see, info you share with others, and more</Typography>
                      </Box>

                      <SectionHeader title="Privacy suggestions available" />
                      <Card>
                        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>Take the Privacy Checkup and choose the settings that are right for you</Typography>
                            <Button sx={{ textTransform: 'none', color: '#1a73e8', px: 0 }}>Review suggestion (1)</Button>
                          </Box>
                          <ShieldOutlinedIcon sx={{ color: '#1a73e8' }} />
                        </Box>
                      </Card>

                      {/* Your data & privacy options with blue arrows */}
                      <Box sx={{ mt: 4 }}>
                        <Typography sx={{ fontSize: '1.25rem', mb: 2 }}>Your data & privacy options</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Button sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#202124' }} startIcon={<KeyboardArrowDownOutlinedIcon sx={{ color: '#1a73e8' }} />}>
                            Things you’ve done and places you’ve been
                          </Button>
                          <Button sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#202124' }} startIcon={<KeyboardArrowDownOutlinedIcon sx={{ color: '#1a73e8' }} />}>
                            Info you can share with others
                          </Button>
                          <Button sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#202124' }} startIcon={<KeyboardArrowDownOutlinedIcon sx={{ color: '#1a73e8' }} />}>
                            Data from apps and services you use
                          </Button>
                          <Button sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#202124' }} startIcon={<KeyboardArrowDownOutlinedIcon sx={{ color: '#1a73e8' }} />}>
                            More options
                          </Button>
                        </Box>
                      </Box>

                      <Box sx={{ mt: 6 }}>
                        <HistorySettingsCard
                          onOpenWebActivity={() => setActiveView('webAndAppActivity')}
                          onOpenTimeline={() => setActiveView('locationHistoryControls')}
                          onOpenStreamTube={() => setActiveView('streamTubeHistory')}
                          webActivityStatus={mailGAccountDataPrivacy.webActivityEnabled ? 'On' : 'Off'}
                          timelineStatus={mailGAccountDataPrivacy.locationHistoryEnabled ? 'On' : 'Paused'}
                          streamTubeStatus={mailGAccountDataPrivacy.youtubeHistoryEnabled ? 'On' : 'Off'}
                        />
                      </Box>

                      {/* See and delete your history anytime */}
                      <Box sx={{ mt: 3 }}>
                        <Typography sx={{ fontSize: '0.95rem', color: 'text.secondary', fontWeight: 500, mb: 1.5 }}>
                          See and delete your history anytime
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                          <Chip icon={<ManageHistoryOutlinedIcon sx={{ color: '#1a73e8 !important' }} />} label="My Activity" variant="outlined" sx={{
                            borderRadius: 99,
                            borderColor: 'rgba(100,121,143,0.28)',
                            color: '#1a73e8'
                          }} />
                          <Chip icon={<MapOutlinedIcon sx={{ color: '#1a73e8 !important' }} />} label="NavMapper Timeline" variant="outlined" sx={{
                            borderRadius: 99,
                            borderColor: 'rgba(100,121,143,0.28)',
                            color: '#1a73e8'
                          }} />
                          <Chip icon={<PlayCircleOutlineIcon sx={{ color: '#d93025 !important' }} />} label="StreamTube watch & search history" variant="outlined" sx={{
                            borderRadius: 99,
                            borderColor: 'rgba(100,121,143,0.28)',
                            color: '#5f6368'
                          }} />
                        </Box>
                      </Box>

                      <Box sx={{ mt: 6 }}>
                        <Typography sx={{ fontSize: '1.25rem', mb: 2 }}>Ads and Personalization</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Card>
                              <Box sx={{ p: 2 }}>
                                <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>Personalized ads</Typography>
                                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 0.5 }}>
                                  You can choose whether the ads you see on MailG services and partner sites are personalized
                                </Typography>
                              </Box>
                              <Divider />
                              <Button onClick={() => setActiveView('myAdCenter')} sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#fde68a', mr: 1, position: 'relative' }} />
                                  <Typography>My Ad Center</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <CheckCircleOutlineIcon sx={{ color: '#1a73e8', mr: 1 }} />
                                  <Typography sx={{ color: '#202124' }}>{privacySettings.adsPersonalizationEnabled ? 'On' : 'Off'}</Typography>
                                  <ChevronRightIcon sx={{ color: 'text.disabled', ml: 1 }} />
                                </Box>
                              </Button>
                              <Divider />
                              <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <SettingsOutlinedIcon sx={{ color: '#d93025', mr: 1, opacity: 0.8 }} />
                                  <Typography>Partner ads settings</Typography>
                                </Box>
                                <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                              </Button>
                              <Divider />
                              <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <ShieldOutlinedIcon sx={{ color: '#1a73e8', mt: 0.25 }} />
                                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                  We protect your privacy. Content from CloudVault, MailG, and other services is never used for any ads purposes.
                                </Typography>
                              </Box>
                            </Card>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Card>
                              <Box sx={{ p: 2, flex: 1 }}>
                                <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>Search personalization</Typography>
                                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 0.5 }}>Choose whether Search can show you personalized experiences based on data saved in your MailG account</Typography>
                              </Box>
                              <Divider />
                              <Button onClick={() => setActiveView('searchPersonalizationControls')} sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <CheckCircleOutlineIcon sx={{ color: '#1a73e8', mr: 1 }} />
                                  <Typography>{privacySettings.personalizationEnabled ? 'On' : 'Off'}</Typography>
                                </Box>
                                <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                              </Button>
                            </Card>
                          </Grid>
                        </Grid>
                      </Box>

                      {/* Info you can share with others */}
                      <Box sx={{ mt: 6 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Info you can share with others</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', maxWidth: 500 }}>
                            Personal info you've saved in your account, like your birthday or email address, and options to manage it. This info is private to you, but you can make some of it visible to others on MailG services.
                          </Typography>
                          <Box sx={{ width: 80, height: 50, backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: 2 }}>
                            <GroupsOutlinedIcon sx={{ color: '#4caf50' }} />
                          </Box>
                        </Box>
                        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
                          <Button onClick={() => setActiveView('aboutMe')} sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <PersonOutlinedIcon sx={{ color: 'text.secondary', mr: 2 }} />
                              <Typography>Profile</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1 }}>Your info and who can see it</Typography>
                              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                            </Box>
                          </Button>
                          <Divider />
                          <Button onClick={() => setActiveView('locationSharing')} sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <MapOutlinedIcon sx={{ color: 'text.secondary', mr: 2 }} />
                              <Typography>Location Sharing</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1 }}>Not sharing with anyone</Typography>
                              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                            </Box>
                          </Button>
                        </Paper>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 500, mb: 1 }}>Other relevant options</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          <Chip label="Payment methods" variant="outlined" sx={{ borderRadius: 999, borderColor: 'rgba(100,121,143,0.28)' }} />
                          <Chip label="Subscriptions" variant="outlined" sx={{ borderRadius: 999, borderColor: 'rgba(100,121,143,0.28)' }} />
                          <Chip label="Your devices" variant="outlined" sx={{ borderRadius: 999, borderColor: 'rgba(100,121,143,0.28)' }} />
                          <Chip label="Contacts" variant="outlined" sx={{ borderRadius: 999, borderColor: 'rgba(100,121,143,0.28)' }} />
                        </Box>
                      </Box>

                      {/* Data from apps and services you use */}
                      <Box sx={{ mt: 6 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Data from apps and services you use</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 3, maxWidth: 600 }}>
                          Your content and preferences related to the MailG services you use and third-party apps and services
                        </Typography>
                        <Paper sx={{ overflow: 'hidden' }}>
                          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                            <Typography sx={{ fontSize: '0.95rem', fontWeight: 500, mb: 1 }}>Content saved from MailG services</Typography>
                            <Button onClick={() => setActiveView('servicesDashboard')} sx={{ justifyContent: 'space-between', textTransform: 'none', py: 1, px: 1, width: '100%', borderRadius: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip icon={<MailOutlineIcon sx={{ color: '#d93025 !important' }} />} label="MailG" variant="outlined" size="small" sx={{ borderRadius: 999 }} />
                                <Chip icon={<StorageOutlinedIcon sx={{ color: '#1a73e8 !important' }} />} label="CloudVault" variant="outlined" size="small" sx={{ borderRadius: 999 }} />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1 }}>A summary of your services and data</Typography>
                                <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                              </Box>
                            </Button>
                          </Box>
                          <Button onClick={() => setActiveView('thirdPartyApps')} sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CloudOutlinedIcon sx={{ color: 'text.secondary', mr: 2 }} />
                              <Typography>Third-party apps & services</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1 }}>
                                {thirdPartyApps.length === 0 ? 'No apps connected' : `${thirdPartyApps.length} total apps & services`}
                              </Typography>
                              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                            </Box>
                          </Button>
                        </Paper>
                      </Box>

                      {/* More options */}
                      <Box sx={{ mt: 6 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 2 }}>More options</Typography>
                        <Paper sx={{ overflow: 'hidden' }}>
                          <Box sx={{ p: 2, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <DeleteOutlineIcon sx={{ color: '#dc2626', mr: 2 }} />
                              <Box>
                                <Typography sx={{ fontWeight: 500, color: '#b91c1c' }}>Delete your MailG Account</Typography>
                                <Typography sx={{ fontSize: '0.875rem', color: '#dc2626' }}>Permanently delete your entire account and data.</Typography>
                              </Box>
                            </Box>
                            <ChevronRightIcon sx={{ color: '#dc2626' }} />
                          </Box>
                        </Paper>
                      </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'webAndAppActivity' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Activity controls</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Choose which settings will save data in your MailG Account.</Typography>
                      </Box>

                      <OutlinedPanel sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <CheckCircleOutlineIcon sx={{ color: '#1a73e8' }} />
                          <Box>
                            <Typography sx={{ fontSize: '0.95rem', fontWeight: 500 }}>Safer with MailG</Typography>
                            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                              You control what data gets saved to your account.
                              <Link href="#" underline="hover"> Learn more</Link>
                            </Typography>
                          </Box>
                        </Box>
                      </OutlinedPanel>

                      <OutlinedPanel>
                        {/* Illustration */}
                        <Box sx={{ textAlign: 'center', mb: 2 }}>
                          <Box component="svg" viewBox="0 0 100 50" sx={{ width: 240, height: 'auto' }}>
                            <rect x="15" y="5" width="30" height="20" rx="2" stroke="#D1D5DB" strokeWidth="1.5" fill="#fff" />
                            <rect x="55" y="10" width="35" height="25" rx="2" stroke="#D1D5DB" strokeWidth="1.5" fill="#fff" />
                            <circle cx="30" cy="15" r="3" fill="#1a73e8" />
                            <rect x="60" y="15" width="25" height="2" fill="#1a73e8" />
                            <path d="M 22 21 L 38 21 L 38 23 L 22 23 Z" fill="#60A5FA" />
                            <text x="70" y="45" fontSize="6" fill="#9CA3AF" textAnchor="middle">Web, Mobile, Tablet</text>
                          </Box>
                        </Box>

                        <Typography sx={{ fontSize: '1.1rem', mb: 1 }}>Web & App Activity</Typography>
                        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
                          Saves your activity on MailG sites and apps, including associated info like location.
                          <Link href="#" underline="hover"> Learn more about Web & App Activity</Link>
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CheckCircleOutlineIcon sx={{ color: mailGAccountDataPrivacy.webActivityEnabled ? '#34a853' : '#9aa0a6' }} />
                          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography>{mailGAccountDataPrivacy.webActivityEnabled ? 'On' : 'Off'}</Typography>
                            <FormGroup>
                              <FormControlLabel 
                                control={
                                  <Switch 
                                    checked={mailGAccountDataPrivacy.webActivityEnabled} 
                                    onChange={(e) => setMailGAccountDataPrivacy({
                                      ...mailGAccountDataPrivacy,
                                      webActivityEnabled: e.target.checked
                                    })} 
                                  />
                                } 
                                label={mailGAccountDataPrivacy.webActivityEnabled ? 'Turn off' : 'Turn on'} 
                              />
                            </FormGroup>
                          </Box>
                        </Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', ml: 5, mt: 1 }}>
                          {mailGAccountDataPrivacy.webActivityEnabled ? 'On since you created your account' : 'Turn on to save your activity'}
                        </Typography>

                        <Divider sx={{ my: 2 }} />
                        <Typography sx={{ fontSize: '0.95rem', mb: 1 }}>See and delete activity</Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                          <Button variant="outlined" size="small" startIcon={<MapOutlinedIcon />} sx={{ textTransform: 'none', borderRadius: 999 }}>NavMapper</Button>
                          <Button variant="outlined" size="small" startIcon={<AddIcon />} sx={{ textTransform: 'none', borderRadius: 999 }}>View all</Button>
                        </Box>

                        <Typography sx={{ fontSize: '0.95rem', mb: 1 }}>Subsettings</Typography>
                        <FormGroup>
                          <FormControlLabel 
                            control={
                              <Checkbox 
                                checked={mailGAccountDataPrivacy.webActivitySubsettings.includeWebHistory}
                                onChange={(e) => setMailGAccountDataPrivacy({
                                  ...mailGAccountDataPrivacy,
                                  webActivitySubsettings: {
                                    ...mailGAccountDataPrivacy.webActivitySubsettings,
                                    includeWebHistory: e.target.checked
                                  }
                                })}
                              />
                            } 
                            label="Include web history and activity from sites, apps, and devices that use MailG services" 
                          />
                          <FormControlLabel 
                            control={
                              <Checkbox 
                                checked={mailGAccountDataPrivacy.webActivitySubsettings.includeVoiceAudio}
                                onChange={(e) => setMailGAccountDataPrivacy({
                                  ...mailGAccountDataPrivacy,
                                  webActivitySubsettings: {
                                    ...mailGAccountDataPrivacy.webActivitySubsettings,
                                    includeVoiceAudio: e.target.checked
                                  }
                                })}
                              />
                            } 
                            label="Include voice and audio activity" 
                          />
                          <FormControlLabel 
                            control={
                              <Checkbox 
                                checked={mailGAccountDataPrivacy.webActivitySubsettings.includeVisualSearch}
                                onChange={(e) => setMailGAccountDataPrivacy({
                                  ...mailGAccountDataPrivacy,
                                  webActivitySubsettings: {
                                    ...mailGAccountDataPrivacy.webActivitySubsettings,
                                    includeVisualSearch: e.target.checked
                                  }
                                })}
                              />
                            } 
                            label="Include Visual Search History" 
                          />
                        </FormGroup>

                        <Typography sx={{ fontSize: '0.95rem', mt: 3, mb: 1 }}>Auto-delete (18m)</Typography>
                        <Button sx={{ justifyContent: 'space-between', textTransform: 'none', width: '100%' }}>
                          <Typography>Deleting activity older than 18 months</Typography>
                          <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                        </Button>

                        <Button sx={{ textTransform: 'none', color: '#1a73e8', mt: 1, px: 0 }} endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 18 }} />}>
                          Manage all Web & App Activity
                        </Button>
                      </OutlinedPanel>

                      <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <Button onClick={() => setActiveView('dataAndPrivacy')} sx={{ textTransform: 'none', color: '#1a73e8' }} startIcon={<AddIcon sx={{ transform: 'rotate(45deg)' }} />}>
                          See all activity controls
                        </Button>
                      </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'locationHistoryControls' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Activity controls</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Choose which settings will save data in your MailG Account.</Typography>
                      </Box>

                      <OutlinedPanel>
                        <Typography sx={{ fontSize: '1.1rem', mb: 1 }}>Timeline</Typography>
                        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
                          Helps you go back in time, and remember where you've been.
                          <Link href="#" underline="hover"> Learn more</Link>
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography>{mailGAccountDataPrivacy.locationHistoryEnabled ? 'ON' : 'OFF'}</Typography>
                          <FormGroup>
                            <FormControlLabel 
                              control={
                                <Switch 
                                  checked={mailGAccountDataPrivacy.locationHistoryEnabled}
                                  onChange={(e) => setMailGAccountDataPrivacy({
                                    ...mailGAccountDataPrivacy,
                                    locationHistoryEnabled: e.target.checked
                                  })}
                                />
                              } 
                              label={mailGAccountDataPrivacy.locationHistoryEnabled ? 'Turn off' : 'Turn on'} 
                            />
                          </FormGroup>
                        </Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 1 }}>
                          {mailGAccountDataPrivacy.locationHistoryEnabled ? 'On since you enabled it' : 'Off by default when you created your account'}
                        </Typography>

                        <Divider sx={{ my: 2 }} />
                        <Typography sx={{ fontSize: '0.95rem', mb: 1 }}>Subsettings</Typography>
                        <FormGroup>
                          <FormControlLabel 
                            control={
                              <Switch 
                                checked={mailGAccountDataPrivacy.locationHistorySubsettings.shareEdits}
                                onChange={(e) => setMailGAccountDataPrivacy({
                                  ...mailGAccountDataPrivacy,
                                  locationHistorySubsettings: {
                                    ...mailGAccountDataPrivacy.locationHistorySubsettings,
                                    shareEdits: e.target.checked
                                  }
                                })}
                              />
                            } 
                            label="Share Timeline edits and related data to improve your experience" 
                          />
                        </FormGroup>

                        <Typography sx={{ fontSize: '0.95rem', mt: 3, mb: 1 }}>Auto-delete (Not applicable)</Typography>
                        <Button sx={{ justifyContent: 'space-between', textTransform: 'none', width: '100%' }}>
                          <Typography>Turn on Timeline to choose an auto-delete option</Typography>
                          <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                        </Button>
                      </OutlinedPanel>

                      <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <Button onClick={() => setActiveView('dataAndPrivacy')} sx={{ textTransform: 'none', color: '#1a73e8' }}>
                          See all activity controls
                        </Button>
                      </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'streamTubeHistory' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Activity controls</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Choose which settings will save data in your MailG Account.</Typography>
                      </Box>

                      <OutlinedPanel>
                        <Typography sx={{ fontSize: '1.1rem', mb: 1 }}>StreamTube History</Typography>
                        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
                          Save your StreamTube watch and search history to get better recommendations and remember where you left off.
                          <Link href="#" underline="hover"> Learn more</Link>
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography>{mailGAccountDataPrivacy.youtubeHistoryEnabled ? 'ON' : 'OFF'}</Typography>
                          <FormGroup>
                            <FormControlLabel 
                              control={
                                <Switch 
                                  checked={mailGAccountDataPrivacy.youtubeHistoryEnabled}
                                  onChange={(e) => setMailGAccountDataPrivacy({
                                    ...mailGAccountDataPrivacy,
                                    youtubeHistoryEnabled: e.target.checked
                                  })}
                                />
                              } 
                              label={mailGAccountDataPrivacy.youtubeHistoryEnabled ? 'Turn off' : 'Turn on'} 
                            />
                          </FormGroup>
                        </Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 1 }}>
                          {mailGAccountDataPrivacy.youtubeHistoryEnabled ? 'On since you created your account' : 'Off'}
                        </Typography>

                        <Divider sx={{ my: 2 }} />
                        <Typography sx={{ fontSize: '0.95rem', mb: 1 }}>Manage your StreamTube History</Typography>
                        <Button sx={{ justifyContent: 'space-between', textTransform: 'none', width: '100%' }}>
                          <Typography>View and delete your StreamTube history</Typography>
                          <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                        </Button>
                      </OutlinedPanel>

                      <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <Button onClick={() => setActiveView('dataAndPrivacy')} sx={{ textTransform: 'none', color: '#1a73e8' }}>
                          See all activity controls
                        </Button>
                      </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'searchPersonalizationControls' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Search personalization</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Choose whether Search can show you personalized experiences based on saved data</Typography>
                      </Box>

                      <OutlinedPanel>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography sx={{ fontSize: '1rem' }}>Personalize Search</Typography>
                          <Switch 
                            checked={mailGAccountDataPrivacy.searchPersonalizationEnabled} 
                            onChange={(e) => setMailGAccountDataPrivacy({
                              ...mailGAccountDataPrivacy,
                              searchPersonalizationEnabled: e.target.checked
                            })} 
                          />
                        </Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 1 }}>
                          You get personalized versions of things like Discover stories, movie recommendations, and auto-complete suggestions.
                        </Typography>
                      </OutlinedPanel>

                      <Box sx={{ mt: 3 }}>
                        <Typography sx={{ fontSize: '1.25rem', mb: 2 }}>Your Search data</Typography>
                        <OutlinedPanel sx={{ p: 0 }}>
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Typography>Search history</Typography>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Button>
                          <Divider />
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Typography>Liked</Typography>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Button>
                          <Divider />
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Typography>Following</Typography>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Button>
                          <Divider />
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Typography>Not interested</Typography>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Button>
                          <Divider />
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Typography>Streaming preferences</Typography>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Button>
                        </OutlinedPanel>
                      </Box>

                      <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <Button onClick={() => setActiveView('dataAndPrivacy')} sx={{ textTransform: 'none', color: '#1a73e8' }}>
                          Back to Data & privacy
                        </Button>
                      </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'myAdCenter' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Personalized ads</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Simply turn off info you don't want used to personalize your ads.</Typography>
                      </Box>

                      {/* Top toggle row */}
                      <OutlinedPanel sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 500 }}>Personalized ads</Typography>
                        <FormGroup>
                          <FormControlLabel control={<Switch checked={!!privacySettings.adsPersonalizationEnabled} onChange={toggle('adsPersonalizationEnabled')} />} label={privacySettings.adsPersonalizationEnabled ? 'On' : 'Off'} />
                        </FormGroup>
                      </OutlinedPanel>

                      {/* Your account info tiles */}
                      <Typography sx={{ fontSize: '1.1rem', mb: 1 }}>Your MailG Account info</Typography>
                      <Typography sx={{ color: 'text.secondary', mb: 2, fontSize: '0.875rem' }}>
                        These details are used to personalize ads based on info you've shared or that's been guessed.
                      </Typography>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                          <OutlinedPanel>
                            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>Age</Typography>
                            <Typography sx={{ fontSize: '0.95rem' }}>25-34 years</Typography>
                          </OutlinedPanel>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <OutlinedPanel>
                            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>Language</Typography>
                            <Typography sx={{ fontSize: '0.95rem' }}>English</Typography>
                          </OutlinedPanel>
                        </Grid>
                      </Grid>

                      {/* Categories used to show you ads */}
                      <Typography sx={{ fontSize: '1.1rem', mb: 1 }}>Categories used to show you ads</Typography>
                      <Typography sx={{ color: 'text.secondary', mb: 2, fontSize: '0.875rem' }}>
                        You may see ads meant for people in these categories, which are based on your MailG activity.
                      </Typography>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        {['Relationships', 'Education', 'Industry', 'Employer Size'].map((label, idx) => (
                          <Grid key={idx} item xs={12} sm={6} md={3}>
                            <OutlinedPanel>
                              <Typography sx={{ fontSize: '0.9rem' }}>{label}</Typography>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>On</Typography>
                            </OutlinedPanel>
                          </Grid>
                        ))}
                      </Grid>

                      {/* Activity used to personalize ads */}
                      <Typography sx={{ fontSize: '1.1rem', mb: 1 }}>Activity used to personalize ads</Typography>
                      <Typography sx={{ color: 'text.secondary', mb: 2, fontSize: '0.875rem' }}>
                        Things you do on MailG sites and apps may be used to personalize ads you see.
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <OutlinedPanel sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography>Web & App Activity</Typography>
                            <Typography sx={{ color: 'text.secondary' }}>On</Typography>
                          </OutlinedPanel>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <OutlinedPanel sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography>Areas where you've used MailG</Typography>
                            <Typography sx={{ color: 'text.secondary' }}>On</Typography>
                          </OutlinedPanel>
                        </Grid>
                      </Grid>

                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mt: 3 }}>
                        <ShieldOutlinedIcon sx={{ color: '#1a73e8', mt: 0.25 }} />
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                          We protect your privacy. Content from CloudVault, MailG, and other services is never used for any ads purposes.
                        </Typography>
                      </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'thirdPartyApps' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <CloudOutlinedIcon sx={{ fontSize: 48, color: '#5f6368', mb: 1 }} />
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Third-party apps & services</Typography>
                        <Typography sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto' }}>
                          Keep track of your connections
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 1 }}>
                          You shared data with these third-party apps and services. <Link href="#" sx={{ color: '#1a73e8', textDecoration: 'none' }}>Learn more</Link>
                        </Typography>
                      </Box>

                      {/* Total count and search */}
                      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: '1.25rem', fontWeight: 500 }}>
                          {thirdPartyApps.length} total apps & services
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton onClick={() => setActiveView('signInSettings')} size="small">
                            <SettingsOutlinedIcon sx={{ color: 'text.secondary' }} />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Filter tabs */}
                      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                          label={`Sign in with Google (${thirdPartyApps.filter(app => app.access === 'Sign in with Google').length})`}
                          variant="outlined"
                          sx={{ borderRadius: '16px', fontSize: '0.875rem' }}
                        />
                        <Chip 
                          label={`Access to Any account access (${thirdPartyApps.length})`}
                          variant="outlined"
                          sx={{ borderRadius: '16px', fontSize: '0.875rem' }}
                        />
                      </Box>

                      {/* Apps list */}
                      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        {thirdPartyApps.map((app, index) => (
                          <React.Fragment key={app.id}>
                            {index > 0 && <Divider />}
                            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', '&:hover': { bgcolor: '#f5f5f5' } }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                {/* App icon placeholder */}
                                <Box sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  borderRadius: '50%', 
                                  bgcolor: '#e8f0fe', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  border: '1px solid #dadce0'
                                }}>
                                  <CloudOutlinedIcon sx={{ color: '#1a73e8', fontSize: 20 }} />
                                </Box>
                                
                                {/* App info */}
                                <Box sx={{ flex: 1 }}>
                                  <Typography sx={{ fontWeight: 500, fontSize: '0.95rem' }}>{app.name}</Typography>
                                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                    Last accessed: {app.lastAccessed}
                                  </Typography>
                                </Box>
                              </Box>

                              {/* Chevron */}
                              <ChevronRightIcon sx={{ color: 'text.disabled', cursor: 'pointer' }} onClick={() => setDeleteAppDialog(app.id)} />
                            </Box>
                          </React.Fragment>
                        ))}
                      </Paper>

                      {thirdPartyApps.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                          <CloudOutlinedIcon sx={{ fontSize: 64, color: '#dadce0', mb: 2 }} />
                          <Typography sx={{ color: 'text.secondary' }}>No apps connected</Typography>
                        </Box>
                      )}
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'signInSettings' && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ width: '100%', maxWidth: 680 }}>
                      <Box sx={{ textAlign: 'left', mb: 3, px: 2 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Sign in with MailG settings</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          Changes that you make here apply to Sign in with MailG, where you use it to sign in to third-party apps and services
                        </Typography>
                      </Box>

                      {/* Sign-in prompts section */}
                      <Box sx={{ px: 2 }}>
                        <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontSize: '1rem', fontWeight: 500, mb: 1 }}>Sign-in prompts</Typography>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>
                                Allow MailG to display a sign-in prompt on Android. <Link href="#" sx={{ color: '#1a73e8', textDecoration: 'none' }}>Learn more about sign-in prompts on Android</Link>
                              </Typography>
                            </Box>
                            <Switch
                              checked={signInSettings.signInPromptsEnabled}
                              onChange={(e) => setSignInSettings({ ...signInSettings, signInPromptsEnabled: e.target.checked })}
                              sx={{
                                ml: 2,
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                  color: '#1a73e8',
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  backgroundColor: '#1a73e8',
                                },
                              }}
                            />
                          </Box>
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            To manage third-party sign-ins on Browser, go to Browser settings. <Link href="#" sx={{ color: '#1a73e8', textDecoration: 'none' }}>Learn more about sign-in prompts on Browser</Link>
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}

              {activeView === 'servicesDashboard' && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ width: '100%', maxWidth: 680 }}>
                      <Box sx={{ textAlign: 'left', mb: 3, px: 2 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>MailG Dashboard</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          See a summary of the services you use and the data saved in your MailG Account
                        </Typography>
                      </Box>

                      {/* Top action cards */}
                      <Grid container spacing={2} sx={{ mb: 4, px: 2 }}>
                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
                            <Box sx={{ 
                              width: 48, 
                              height: 48, 
                              borderRadius: '50%', 
                              bgcolor: '#e8f0fe', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}>
                              <DownloadOutlinedIcon sx={{ color: '#1a73e8', fontSize: 24 }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontWeight: 500, fontSize: '0.95rem', mb: 0.5 }}>Download your data</Typography>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                You can download a copy of your data to save locally or to use with another account
                              </Typography>
                            </Box>
                            <OpenInNewOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
                            <Box sx={{ 
                              width: 48, 
                              height: 48, 
                              borderRadius: '50%', 
                              bgcolor: '#fef7e0', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}>
                              <DeleteOutlineIcon sx={{ color: '#f9ab00', fontSize: 24 }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontWeight: 500, fontSize: '0.95rem', mb: 0.5 }}>Delete a service</Typography>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                You can delete a specific MailG service from your account, like StreamTube
                              </Typography>
                            </Box>
                            <OpenInNewOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Recently used services */}
                      <Box sx={{ mb: 4, px: 2 }}>
                        <Typography sx={{ fontSize: '1.25rem', mb: 2, fontWeight: 500 }}>Recently used MailG services (2)</Typography>
                        <Grid container spacing={2}>
                          {/* MailG Service */}
                          <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                              <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                  <MailOutlineIcon sx={{ color: '#d93025', fontSize: 28 }} />
                                  <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>MailG</Typography>
                                </Box>
                                <Box sx={{ mb: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <MailOutlineIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography sx={{ fontSize: '0.875rem' }}>4 conversations</Typography>
                                  </Box>
                                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 3 }}>1 in inbox</Typography>
                                </Box>
                                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>3 drafts</Typography>
                              </Box>
                              <Box sx={{ p: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 999 }}>
                                  Download
                                </Button>
                                <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 999 }}>
                                  Settings
                                </Button>
                                <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 999 }}>
                                  Help Center
                                </Button>
                              </Box>
                            </Paper>
                          </Grid>

                          {/* CloudVault Service */}
                          <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                              <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                  <StorageOutlinedIcon sx={{ color: '#1a73e8', fontSize: 28 }} />
                                  <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>CloudVault</Typography>
                                </Box>
                                <Box sx={{ mb: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <FolderOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography sx={{ fontSize: '0.875rem' }}>3 files</Typography>
                                  </Box>
                                </Box>
                              </Box>
                              <Box sx={{ p: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 999 }}>
                                  Download
                                </Button>
                                <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 999 }}>
                                  Help Center
                                </Button>
                              </Box>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>

                      {/* Other services */}
                      <Box sx={{ px: 2 }}>
                        <Typography sx={{ fontSize: '1.25rem', mb: 2, fontWeight: 500 }}>Other MailG services (2)</Typography>
                        <Grid container spacing={2}>
                          {/* Browser Service */}
                          <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                              <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                  <ExtensionOutlinedIcon sx={{ color: '#5f6368', fontSize: 28 }} />
                                  <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>Browser</Typography>
                                </Box>
                                <Box sx={{ mb: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <ManageHistoryOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography sx={{ fontSize: '0.875rem' }}>Last sync: today at 7:27 PM</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <BookmarkBorderOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography sx={{ fontSize: '0.875rem' }}>4 bookmarks</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ExtensionOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography sx={{ fontSize: '0.875rem' }}>2 extensions</Typography>
                                  </Box>
                                </Box>
                                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>58 other items</Typography>
                              </Box>
                              <Box sx={{ p: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 999 }}>
                                  Download
                                </Button>
                                <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 999 }}>
                                  Help Center
                                </Button>
                                <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 999 }}>
                                  Browser sync help
                                </Button>
                              </Box>
                            </Paper>
                          </Grid>

                          {/* Tasks Service */}
                          <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                              <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                  <AssignmentOutlinedIcon sx={{ color: '#1a73e8', fontSize: 28 }} />
                                  <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>Tasks</Typography>
                                </Box>
                                <Box sx={{ mb: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <AssignmentOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography sx={{ fontSize: '0.875rem' }}>1 task list</Typography>
                                  </Box>
                                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 3 }}>Most recent:</Typography>
                                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 3 }}>My Tasks</Typography>
                                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 3 }}>on October 15</Typography>
                                </Box>
                              </Box>
                              <Box sx={{ p: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 999 }}>
                                  Download
                                </Button>
                                <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 999 }}>
                                  Help Center
                                </Button>
                              </Box>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}

              {activeView === 'locationSharing' && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ width: '100%', maxWidth: 680 }}>
                      <Box sx={{ textAlign: 'left', mb: 3, px: 2 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Location Sharing</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 2 }}>
                          Location Sharing lets you share your real-time location from your devices with people you choose.
                        </Typography>
                      </Box>

                      {/* What information is shared */}
                      <Box sx={{ px: 2, mb: 4 }}>
                        <Typography sx={{ fontSize: '1.1rem', fontWeight: 500, mb: 2 }}>What information is shared</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 2 }}>
                          People you share your location with can see your name, photo, and real-time location across MailG services, even when you're not using Maps. They can also see Location Sharing notifications to know when you arrive at or leave specific locations.
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 3 }}>
                          Shared information may include where you've recently been, how you're traveling, and your device info.
                        </Typography>

                        {/* Status card */}
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            bgcolor: '#f5f5f5', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <MapOutlinedIcon sx={{ color: '#5f6368', fontSize: 24 }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                              You aren't sharing your real-time location with anyone on MailG.
                            </Typography>
                          </Box>
                        </Paper>

                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>
                          <strong>Protect your privacy.</strong> To stop sharing your location with someone, tap Stop next to their name. To temporarily stop all location sharing, turn off location in your device settings. <Link href="#" sx={{ color: '#1a73e8', textDecoration: 'none' }}>Learn more</Link>
                        </Typography>
                      </Box>

                      {/* Disable info */}
                      <Box sx={{ px: 2, mb: 4 }}>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          You can disable Location Sharing from <Link href="#" sx={{ color: '#1a73e8', textDecoration: 'none' }}>this page</Link>, but you can only start sharing your location from your mobile device. Location Sharing works across MailG apps and services, including MailG Maps and Family Link.
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}

              {activeView === 'aboutMe' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>About me</Typography>
                        <Typography sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto', fontSize: '0.875rem' }}>
                          Manage your personal info and control who can see it when you use your main MailG Account profile across MailG services. <Link href="#" sx={{ color: '#1a73e8', textDecoration: 'none' }}>Learn more</Link>
                        </Typography>
                      </Box>

                      {/* Visibility indicators */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PersonOutlinedIcon sx={{ fontSize: 16, color: '#1a73e8' }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Visible only to you</Typography>
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>Only you</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <GroupsOutlinedIcon sx={{ fontSize: 16, color: '#1a73e8' }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Visible to anyone</Typography>
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>Anyone</Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Basic info */}
                      <Card>
                        <Box sx={{ p: 2 }}>
                          <Typography sx={{ fontSize: '1rem', mb: 2, fontWeight: 500 }}>Basic info</Typography>
                          
                          {/* Name */}
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                            onClick={() => {
                              setEditFormData({ field: 'nameVisibility', value: mailGAccountDataPrivacy.profileVisibility.nameVisibility });
                              setEditDialogOpen('nameVisibility');
                            }}
                          >
                            <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Name</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                              <Box>
                                <Typography sx={{ fontSize: '0.875rem' }}>{mailGAccountPersonalInfo.name}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                  {mailGAccountDataPrivacy.profileVisibility.nameVisibility === 'anyone' ? (
                                    <>
                                      <GroupsOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                      <Typography sx={{ fontSize: '0.75rem', color: '#1a73e8' }}>Visible to anyone</Typography>
                                    </>
                                  ) : (
                                    <>
                                      <PersonOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                      <Typography sx={{ fontSize: '0.75rem', color: '#1a73e8' }}>Visible only to you</Typography>
                                    </>
                                  )}
                                </Box>
                              </Box>
                              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                            </Box>
                          </Box>

                          {/* Profile picture */}
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                            onClick={() => {
                              setEditFormData({ field: 'profilePictureVisibility', value: mailGAccountDataPrivacy.profileVisibility.profilePictureVisibility });
                              setEditDialogOpen('profilePictureVisibility');
                            }}
                          >
                            <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Profile picture</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                              <Box>
                                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Add a profile picture to personalize your account</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                  {mailGAccountDataPrivacy.profileVisibility.profilePictureVisibility === 'anyone' ? (
                                    <>
                                      <GroupsOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                      <Typography sx={{ fontSize: '0.75rem', color: '#1a73e8' }}>Visible to anyone</Typography>
                                    </>
                                  ) : (
                                    <>
                                      <PersonOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                      <Typography sx={{ fontSize: '0.75rem', color: '#1a73e8' }}>Visible only to you</Typography>
                                    </>
                                  )}
                                </Box>
                              </Box>
                              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                            </Box>
                          </Box>

                          {/* Gender */}
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                            onClick={() => {
                              setEditFormData({ field: 'genderVisibility', value: mailGAccountDataPrivacy.profileVisibility.genderVisibility });
                              setEditDialogOpen('genderVisibility');
                            }}
                          >
                            <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Gender</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                              <Box>
                                <Typography sx={{ fontSize: '0.875rem' }}>{mailGAccountPersonalInfo.gender}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                  {mailGAccountDataPrivacy.profileVisibility.genderVisibility === 'anyone' ? (
                                    <>
                                      <GroupsOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                      <Typography sx={{ fontSize: '0.75rem', color: '#1a73e8' }}>Visible to anyone</Typography>
                                    </>
                                  ) : (
                                    <>
                                      <PersonOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                      <Typography sx={{ fontSize: '0.75rem', color: '#1a73e8' }}>Visible only to you</Typography>
                                    </>
                                  )}
                                </Box>
                              </Box>
                              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                            </Box>
                          </Box>

                          {/* Birthday */}
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                            onClick={() => {
                              setEditFormData({ field: 'birthdayVisibility', value: mailGAccountDataPrivacy.profileVisibility.birthdayVisibility });
                              setEditDialogOpen('birthdayVisibility');
                            }}
                          >
                            <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Birthday</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                              <Box>
                                <Typography sx={{ fontSize: '0.875rem' }}>
                                  {mailGAccountPersonalInfo.birthday.month.substring(0, 3)} {mailGAccountPersonalInfo.birthday.day}, {mailGAccountPersonalInfo.birthday.year}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                  {mailGAccountDataPrivacy.profileVisibility.birthdayVisibility === 'anyone' ? (
                                    <>
                                      <GroupsOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                      <Typography sx={{ fontSize: '0.75rem', color: '#1a73e8' }}>Visible to anyone</Typography>
                                    </>
                                  ) : (
                                    <>
                                      <PersonOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                      <Typography sx={{ fontSize: '0.75rem', color: '#1a73e8' }}>Visible only to you</Typography>
                                    </>
                                  )}
                                </Box>
                              </Box>
                              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                            </Box>
                          </Box>
                        </Box>
                      </Card>

                      {/* Contact info */}
                      <Card sx={{ mt: 3 }}>
                        <Box sx={{ p: 2 }}>
                          <Typography sx={{ fontSize: '1rem', mb: 2, fontWeight: 500 }}>Contact info</Typography>
                          
                          {/* Email */}
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                            onClick={() => {
                              setEditFormData({ field: 'emailVisibility', value: mailGAccountDataPrivacy.profileVisibility.emailVisibility });
                              setEditDialogOpen('emailVisibility');
                            }}
                          >
                            <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>MailG Account email</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                              <Box>
                                <Typography sx={{ fontSize: '0.875rem' }}>{mailGAccountPersonalInfo.emails[0]}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                  {mailGAccountDataPrivacy.profileVisibility.emailVisibility === 'anyone' ? (
                                    <>
                                      <GroupsOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                      <Typography sx={{ fontSize: '0.75rem', color: '#1a73e8' }}>Visible to anyone</Typography>
                                    </>
                                  ) : (
                                    <>
                                      <PersonOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                      <Typography sx={{ fontSize: '0.75rem', color: '#1a73e8' }}>Visible only to you</Typography>
                                    </>
                                  )}
                                </Box>
                              </Box>
                              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                            </Box>
                          </Box>
                        </Box>
                      </Card>

                      {/* Note about contact info */}
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 2 }}>
                        MailG may use contact info not listed here to reach you. To see more contact info go to the <Link href="#" onClick={(e) => { e.preventDefault(); setActiveView('personalInfo'); }} sx={{ color: '#1a73e8', textDecoration: 'none' }}>Personal info section</Link>
                      </Typography>

                      {/* About section */}
                      <Card sx={{ mt: 3 }}>
                        <Box sx={{ p: 2 }}>
                          <Typography sx={{ fontSize: '1rem', mb: 1, fontWeight: 500 }}>About</Typography>
                          
                          {/* Show Links if any */}
                          {mailGAccountPersonalInfo.about.links.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>Links</Typography>
                              {mailGAccountPersonalInfo.about.links.map((link, index) => (
                                <Box
                                  key={index}
                                  sx={{ display: 'flex', alignItems: 'center', py: 0.5, cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                                  onClick={() => {
                                    setEditFormData({ field: 'linksVisibility', value: mailGAccountDataPrivacy.profileVisibility.linksVisibility || 'anyone' });
                                    setEditDialogOpen('linksVisibility');
                                  }}
                                >
                                  <Typography sx={{ fontSize: '0.875rem', flex: 1 }}>{link}</Typography>
                                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mr: 1 }}>Personal Website</Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {(mailGAccountDataPrivacy.profileVisibility.linksVisibility || 'anyone') === 'anyone' ? (
                                      <GroupsOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                    ) : (
                                      <PersonOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                    )}
                                    <ChevronRightIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          )}

                          {/* Show default text if no data */}
                          {mailGAccountPersonalInfo.about.links.length === 0 && 
                           mailGAccountPersonalInfo.about.places.length === 0 && 
                           !mailGAccountPersonalInfo.about.introduction && (
                            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 2 }}>
                              Places, links, and introduction
                            </Typography>
                          )}
                          
                          <Button
                            onClick={() => setActiveView('addMoreAboutYou')}
                            startIcon={<AddIcon />}
                            sx={{
                              textTransform: 'none',
                              color: '#1a73e8',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              p: 0,
                              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
                            }}
                          >
                            Add more about you
                          </Button>
                        </Box>
                      </Card>

                      {/* Work & education section */}
                      <Card sx={{ mt: 3 }}>
                        <Box sx={{ p: 2 }}>
                          <Typography sx={{ fontSize: '1rem', mb: 1, fontWeight: 500 }}>Work & education</Typography>
                          
                          {/* Show Work History if any */}
                          {mailGAccountPersonalInfo.workAndEducation.workHistory.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>Work</Typography>
                              <Box
                                sx={{ display: 'flex', alignItems: 'center', py: 0.5, cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                                onClick={() => {
                                  setEditFormData({ field: 'workVisibility', value: mailGAccountDataPrivacy.profileVisibility.workVisibility || 'anyone' });
                                  setEditDialogOpen('workVisibility');
                                }}
                              >
                                <Box sx={{ flex: 1 }}>
                                  <Typography sx={{ fontSize: '0.875rem' }}>{mailGAccountPersonalInfo.workAndEducation.workHistory[0]}</Typography>
                                  {mailGAccountPersonalInfo.workAndEducation.workHistory.length > 1 && (
                                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                      +{mailGAccountPersonalInfo.workAndEducation.workHistory.length - 1} more
                                    </Typography>
                                  )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {(mailGAccountDataPrivacy.profileVisibility.workVisibility || 'anyone') === 'anyone' ? (
                                    <GroupsOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                  ) : (
                                    <PersonOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                  )}
                                  <ChevronRightIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                                </Box>
                              </Box>
                            </Box>
                          )}

                          {/* Show Education History if any */}
                          {mailGAccountPersonalInfo.workAndEducation.educationHistory.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>Education</Typography>
                              <Box
                                sx={{ display: 'flex', alignItems: 'center', py: 0.5, cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                                onClick={() => {
                                  setEditFormData({ field: 'educationVisibility', value: mailGAccountDataPrivacy.profileVisibility.educationVisibility || 'anyone' });
                                  setEditDialogOpen('educationVisibility');
                                }}
                              >
                                <Box sx={{ flex: 1 }}>
                                  <Typography sx={{ fontSize: '0.875rem' }}>{mailGAccountPersonalInfo.workAndEducation.educationHistory[0]}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {(mailGAccountDataPrivacy.profileVisibility.educationVisibility || 'anyone') === 'anyone' ? (
                                    <GroupsOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                  ) : (
                                    <PersonOutlinedIcon sx={{ fontSize: 14, color: '#1a73e8' }} />
                                  )}
                                  <ChevronRightIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                                </Box>
                              </Box>
                            </Box>
                          )}

                          {/* Show default text if no data */}
                          {mailGAccountPersonalInfo.workAndEducation.workHistory.length === 0 && 
                           mailGAccountPersonalInfo.workAndEducation.educationHistory.length === 0 && 
                           !mailGAccountPersonalInfo.workAndEducation.occupation && (
                            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 2 }}>
                              Current occupation, work history, and education history
                            </Typography>
                          )}
                          
                          <Button
                            onClick={() => setActiveView('addWorkEducation')}
                            startIcon={<AddIcon />}
                            sx={{
                              textTransform: 'none',
                              color: '#1a73e8',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              p: 0,
                              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
                            }}
                          >
                            Add work & education
                          </Button>
                        </Box>
                      </Card>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'addMoreAboutYou' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Add more about you</Typography>
                      </Box>

                      {/* Options list */}
                      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <Button
                          onClick={() => {
                            setEditFormData({ type: 'place' });
                            setEditDialogOpen('addAboutItem');
                          }}
                          sx={{
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            py: 2,
                            px: 2,
                            width: '100%',
                            color: '#1a73e8',
                            fontSize: '0.875rem',
                            '&:hover': { bgcolor: '#f5f5f5' }
                          }}
                        >
                          Add place
                        </Button>
                        <Divider />
                        <Button
                          onClick={() => {
                            setEditFormData({ type: 'link' });
                            setEditDialogOpen('addAboutItem');
                          }}
                          sx={{
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            py: 2,
                            px: 2,
                            width: '100%',
                            color: '#1a73e8',
                            fontSize: '0.875rem',
                            '&:hover': { bgcolor: '#f5f5f5' }
                          }}
                        >
                          Add link
                        </Button>
                        <Divider />
                        <Button
                          onClick={() => {
                            setEditFormData({ type: 'profileLink' });
                            setEditDialogOpen('addAboutItem');
                          }}
                          sx={{
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            py: 2,
                            px: 2,
                            width: '100%',
                            color: '#1a73e8',
                            fontSize: '0.875rem',
                            '&:hover': { bgcolor: '#f5f5f5' }
                          }}
                        >
                          Add profile link
                        </Button>
                        <Divider />
                        <Button
                          onClick={() => {
                            setEditFormData({ type: 'contributorLink' });
                            setEditDialogOpen('addAboutItem');
                          }}
                          sx={{
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            py: 2,
                            px: 2,
                            width: '100%',
                            color: '#1a73e8',
                            fontSize: '0.875rem',
                            '&:hover': { bgcolor: '#f5f5f5' }
                          }}
                        >
                          Add contributor link
                        </Button>
                        <Divider />
                        <Button
                          onClick={() => {
                            setEditFormData({ type: 'introduction' });
                            setEditDialogOpen('addAboutItem');
                          }}
                          sx={{
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            py: 2,
                            px: 2,
                            width: '100%',
                            color: '#1a73e8',
                            fontSize: '0.875rem',
                            '&:hover': { bgcolor: '#f5f5f5' }
                          }}
                        >
                          Add introduction
                        </Button>
                      </Paper>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'addWorkEducation' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Add work & education</Typography>
                      </Box>

                      {/* Options list */}
                      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <Button
                          onClick={() => {
                            setEditFormData({ type: 'occupation' });
                            setEditDialogOpen('addWorkEducationItem');
                          }}
                          sx={{
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            py: 2,
                            px: 2,
                            width: '100%',
                            color: '#1a73e8',
                            fontSize: '0.875rem',
                            '&:hover': { bgcolor: '#f5f5f5' }
                          }}
                        >
                          Add occupation
                        </Button>
                        <Divider />
                        <Button
                          onClick={() => {
                            setEditFormData({ type: 'workHistory' });
                            setEditDialogOpen('addWorkEducationItem');
                          }}
                          sx={{
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            py: 2,
                            px: 2,
                            width: '100%',
                            color: '#1a73e8',
                            fontSize: '0.875rem',
                            '&:hover': { bgcolor: '#f5f5f5' }
                          }}
                        >
                          Add work history
                        </Button>
                        <Divider />
                        <Button
                          onClick={() => {
                            setEditFormData({ type: 'educationHistory' });
                            setEditDialogOpen('addWorkEducationItem');
                          }}
                          sx={{
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            py: 2,
                            px: 2,
                            width: '100%',
                            color: '#1a73e8',
                            fontSize: '0.875rem',
                            '&:hover': { bgcolor: '#f5f5f5' }
                          }}
                        >
                          Add education history
                        </Button>
                      </Paper>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'personalInfo' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Personal info</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Info about you and your preferences across MailG services</Typography>
                      </Box>

                      {/* Basic info */}
                      <Card>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography sx={{ fontSize: '1rem' }}>Basic info</Typography>
                        <Link href="#" underline="hover" sx={{ fontSize: '0.75rem' }}>Learn more</Link>
                      </Box>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mb: 2 }}>Some info may be visible to other people using MailG services.</Typography>
                      
                      {/* Name */}
                      <Box 
                        sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                        onClick={() => handleOpenEdit('name')}
                      >
                        <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Name</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                          <Typography sx={{ fontSize: '0.875rem' }}>{mailGAccountPersonalInfo.name}</Typography>
                          <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                        </Box>
                      </Box>

                      {/* Nickname */}
                      <Box 
                        sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                        onClick={() => handleOpenEdit('nickname')}
                      >
                        <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Nickname</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                          <Typography sx={{ fontSize: '0.875rem' }}>{mailGAccountPersonalInfo.nickname || 'No nickname'}</Typography>
                          <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                        </Box>
                      </Box>

                      {/* Birthday */}
                      <Box 
                        sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                        onClick={() => handleOpenEdit('birthday')}
                      >
                        <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Birthday</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                          <Typography sx={{ fontSize: '0.875rem' }}>
                            {mailGAccountPersonalInfo.birthday.month.substring(0, 3)} {mailGAccountPersonalInfo.birthday.day}, {mailGAccountPersonalInfo.birthday.year}
                          </Typography>
                          <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                        </Box>
                      </Box>

                      {/* Gender */}
                      <Box 
                        sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                        onClick={() => handleOpenEdit('gender')}
                      >
                        <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Gender</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                          <Typography sx={{ fontSize: '0.875rem' }}>{mailGAccountPersonalInfo.gender}</Typography>
                          <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                        </Box>
                      </Box>
                    </Box>
                  </Card>

                  {/* Contact info */}
                  <Box sx={{ mt: 3 }}>
                    <Card>
                      <Box sx={{ p: 2 }}>
                        <Typography sx={{ fontSize: '1rem', mb: 1 }}>Contact info</Typography>
                        <Box 
                          sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                          onClick={() => handleOpenEdit('email')}
                        >
                          <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Email</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              {mailGAccountPersonalInfo.emails.map((email, index) => (
                                <Typography key={index} sx={{ fontSize: '0.875rem' }}>{email}</Typography>
                              ))}
                            </Box>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Box>
                        </Box>
                        <Box 
                          sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                          onClick={() => handleOpenEdit('phone')}
                        >
                          <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Phone</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                            <Box>
                              <Typography sx={{ fontSize: '0.875rem' }}>{mailGAccountPersonalInfo.phone.number}</Typography>
                              {!mailGAccountPersonalInfo.phone.verified && (
                                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Not verified</Typography>
                              )}
                            </Box>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Box>
                        </Box>
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                          <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>More options</Typography>
                          <Button variant="outlined" startIcon={<MailOutlineIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>
                            Manage emails from MailG
                          </Button>
                        </Box>
                      </Box>
                    </Card>
                  </Box>

                  {/* Addresses */}
                  <Box sx={{ mt: 3 }}>
                    <Card>
                      <Box sx={{ p: 2 }}>
                        <Typography sx={{ fontSize: '1rem', mb: 1 }}>Addresses</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mb: 2 }}>
                          Manage addresses associated with your MailG Account. <Link href="#" underline="hover">Learn more about addresses saved to your account</Link>
                        </Typography>
                        <Box 
                          sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                          onClick={() => handleOpenEdit('homeAddress')}
                        >
                          <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Home</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                            <Typography sx={{ fontSize: '0.875rem' }}>
                              {mailGAccountPersonalInfo.addresses.home || 'Not set'}
                            </Typography>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Box>
                        </Box>
                        <Box 
                          sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                          onClick={() => handleOpenEdit('workAddress')}
                        >
                          <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Work</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
                            <Typography sx={{ fontSize: '0.875rem' }}>
                              {mailGAccountPersonalInfo.addresses.work || 'Not set'}
                            </Typography>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Box>
                        </Box>
                      </Box>
                    </Card>
                  </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Edit Name Dialog */}
      <Dialog open={editDialogOpen === 'name'} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleCancelEdit} sx={{ mr: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: '1.375rem' }}>Name</Typography>
          </Box>
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>Name</Typography>
            <input
              type="text"
              value={editFormData.name || ''}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                outline: 'none',
              }}
            />
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 2 }}>
              Who can see your name
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>people</span>
              <Typography sx={{ fontSize: '0.875rem' }}>
                Anyone can see this info when they communicate with you or view content you create in MailG services.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCancelEdit} sx={{ textTransform: 'none', color: '#1a73e8' }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} variant="contained" sx={{ textTransform: 'none' }}>
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Edit Nickname Dialog */}
      <Dialog open={editDialogOpen === 'nickname'} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleCancelEdit} sx={{ mr: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: '1.375rem' }}>Nickname</Typography>
          </Box>
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>Nickname</Typography>
            <input
              type="text"
              value={editFormData.nickname || ''}
              onChange={(e) => setEditFormData({ ...editFormData, nickname: e.target.value })}
              placeholder="No nickname"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                outline: 'none',
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCancelEdit} sx={{ textTransform: 'none', color: '#1a73e8' }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} variant="contained" sx={{ textTransform: 'none' }}>
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Edit Birthday Dialog */}
      <Dialog open={editDialogOpen === 'birthday'} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleCancelEdit} sx={{ mr: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: '1.375rem' }}>Birthday</Typography>
          </Box>
          
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, mb: 2 }}>
            <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>Birthday</Typography>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', mb: 2 }}
              onClick={() => setEditDialogOpen('updateBirthday')}
            >
              <Typography sx={{ fontSize: '0.875rem' }}>
                {editFormData.month} {editFormData.day}, {editFormData.year}
              </Typography>
              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
            </Box>
            
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 2 }}>Choose who can see your birthday</Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant={editFormData.visibility === 'private' ? 'contained' : 'outlined'}
                onClick={() => setEditFormData({ ...editFormData, visibility: 'private' })}
                startIcon={<span className="material-symbols-outlined">lock</span>}
                sx={{ flex: 1, textTransform: 'none' }}
              >
                Only you
              </Button>
              <Button
                variant={editFormData.visibility === 'public' ? 'contained' : 'outlined'}
                onClick={() => setEditFormData({ ...editFormData, visibility: 'public' })}
                startIcon={<span className="material-symbols-outlined">people</span>}
                sx={{ flex: 1, textTransform: 'none' }}
              >
                Anyone
              </Button>
            </Box>
            
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {editFormData.visibility === 'private' 
                ? 'This info is private. Only you can see it.'
                : 'This info is visible. Anyone can see it.'}
            </Typography>
          </Box>

          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>Let people know it's your birthday</Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 2 }}>
            If you make your birthday visible, you can also choose to have it highlighted across MailG services (for example, by decorating your profile picture)
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#4285f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: 'white', fontSize: '2rem', fontWeight: 500 }}>D</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={handleCancelEdit} sx={{ textTransform: 'none', color: '#1a73e8' }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} variant="contained" sx={{ textTransform: 'none' }}>
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Update Birthday Dialog - for changing the actual date */}
      <Dialog open={editDialogOpen === 'updateBirthday'} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={() => setEditDialogOpen('birthday')} sx={{ mr: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: '1.375rem' }}>Update Birthday</Typography>
          </Box>
          
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 3 }}>
            Your birthday may be used for account security and personalization across MailG services. If this MailG Account is for a business or organization, use the birthday of the person who manages the account.
          </Typography>

          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3 }}>
            <Typography sx={{ fontSize: '0.875rem', mb: 2 }}>Update birthday</Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.75rem', mb: 1 }}>Month</Typography>
                <select
                  value={editFormData.month || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, month: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                  }}
                >
                  <option value="January">January</option>
                  <option value="February">February</option>
                  <option value="March">March</option>
                  <option value="April">April</option>
                  <option value="May">May</option>
                  <option value="June">June</option>
                  <option value="July">July</option>
                  <option value="August">August</option>
                  <option value="September">September</option>
                  <option value="October">October</option>
                  <option value="November">November</option>
                  <option value="December">December</option>
                </select>
              </Box>
              
              <Box sx={{ width: '100px' }}>
                <Typography sx={{ fontSize: '0.75rem', mb: 1 }}>Day</Typography>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={editFormData.day || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, day: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                  }}
                />
              </Box>
              
              <Box sx={{ width: '120px' }}>
                <Typography sx={{ fontSize: '0.75rem', mb: 1 }}>Year</Typography>
                <input
                  type="number"
                  min="1900"
                  max="2024"
                  value={editFormData.year || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, year: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setEditDialogOpen('birthday')} sx={{ textTransform: 'none', color: '#1a73e8' }}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} variant="contained" disabled={!editFormData.month || !editFormData.day || !editFormData.year} sx={{ textTransform: 'none' }}>
                Save
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>

      {/* Edit Phone Dialog */}
      <Dialog open={editDialogOpen === 'phone'} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleCancelEdit} sx={{ mr: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: '1.375rem' }}>Phone number</Typography>
          </Box>
          
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 3 }}>
            This phone number has been added to your MailG Account
          </Typography>

          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <img src="/assets/images/us.png" alt="US flag" style={{ width: 24, height: 16 }} />
                <Typography sx={{ fontSize: '0.875rem' }}>{editFormData.phone}</Typography>
              </Box>
              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Not verified</Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#1a73e8', cursor: 'pointer' }}>• Verify now</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#5f6368' }}>info</span>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              You may have added phone numbers that aren't listed here. If a number you added to a MailG service isn't listed here, go to that service to control how it's used.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button onClick={handleCancelEdit} sx={{ textTransform: 'none', color: '#1a73e8' }}>
              Close
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Edit Email Dialog */}
      <Dialog open={editDialogOpen === 'email'} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleCancelEdit} sx={{ mr: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: '1.375rem' }}>Email</Typography>
          </Box>
          
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>Email</Typography>
            <input
              type="email"
              value={editFormData.email || ''}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              placeholder="john.doe@example.com"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                outline: 'none',
              }}
            />
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 2 }}>
              This email is used for your MailG Account
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCancelEdit} sx={{ textTransform: 'none', color: '#1a73e8' }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} variant="contained" sx={{ textTransform: 'none' }}>
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Edit Gender Dialog */}
      <Dialog open={editDialogOpen === 'gender'} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleCancelEdit} sx={{ mr: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: '1.375rem' }}>Gender</Typography>
          </Box>
          
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography sx={{ fontSize: '0.875rem', mb: 2 }}>Gender</Typography>
            
            <select
              value={editFormData.gender || ''}
              onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                border: '1px solid #dadce0',
                borderRadius: '4px',
              }}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Rather not say">Rather not say</option>
              <option value="Custom">Custom</option>
            </select>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCancelEdit} sx={{ textTransform: 'none', color: '#1a73e8' }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} variant="contained" sx={{ textTransform: 'none' }}>
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Edit Home Address Dialog */}
      <Dialog open={editDialogOpen === 'homeAddress'} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleCancelEdit} sx={{ mr: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: '1.375rem' }}>Home Address</Typography>
          </Box>
          
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>Home Address</Typography>
            <textarea
              value={editFormData.homeAddress || ''}
              onChange={(e) => setEditFormData({ ...editFormData, homeAddress: e.target.value })}
              placeholder="Enter your home address"
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCancelEdit} sx={{ textTransform: 'none', color: '#1a73e8' }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} variant="contained" sx={{ textTransform: 'none' }}>
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Edit Work Address Dialog */}
      <Dialog open={editDialogOpen === 'workAddress'} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleCancelEdit} sx={{ mr: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: '1.375rem' }}>Work Address</Typography>
          </Box>
          
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>Work Address</Typography>
            <textarea
              value={editFormData.workAddress || ''}
              onChange={(e) => setEditFormData({ ...editFormData, workAddress: e.target.value })}
              placeholder="Enter your work address"
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCancelEdit} sx={{ textTransform: 'none', color: '#1a73e8' }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} variant="contained" sx={{ textTransform: 'none' }}>
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Delete App Confirmation Dialog */}
      <Dialog 
        open={deleteAppDialog !== null} 
        onClose={() => setDeleteAppDialog(null)} 
        maxWidth="sm" 
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontSize: '1.5rem', mb: 2 }}>
            Remove {thirdPartyApps.find(app => app.id === deleteAppDialog)?.name}?
          </Typography>
          
          <Typography sx={{ color: 'text.secondary', mb: 3 }}>
            This will remove {thirdPartyApps.find(app => app.id === deleteAppDialog)?.name}'s access to your MailG Account. 
            You may lose access to the app and its data.
          </Typography>

          <Box sx={{ bgcolor: '#f8f9fa', p: 2, borderRadius: 1, mb: 3 }}>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              <strong>What happens next:</strong>
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 1 }}>
              • The app will no longer have access to your MailG Account
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              • You may need to sign in again if you use this app
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              • Some app features may stop working
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              onClick={() => setDeleteAppDialog(null)} 
              sx={{ textTransform: 'none', color: '#1a73e8' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setThirdPartyApps(thirdPartyApps.filter(app => app.id !== deleteAppDialog));
                setDeleteAppDialog(null);
              }}
              variant="contained" 
              color="error"
              sx={{ textTransform: 'none' }}
            >
              Remove access
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Add About Item Dialog */}
      <Dialog 
        open={editDialogOpen === 'addAboutItem'} 
        onClose={handleCancelEdit} 
        maxWidth="sm" 
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleCancelEdit} sx={{ mr: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: '1.375rem' }}>
              {editFormData.type === 'place' && 'Add place'}
              {editFormData.type === 'link' && 'Add link'}
              {editFormData.type === 'profileLink' && 'Add profile link'}
              {editFormData.type === 'contributorLink' && 'Add contributor link'}
              {editFormData.type === 'introduction' && 'Add introduction'}
            </Typography>
          </Box>
          
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography sx={{ fontSize: '0.875rem', mb: 2 }}>
              {editFormData.type === 'introduction' ? 'Introduction' : 'Value'}
            </Typography>
            
            {editFormData.type === 'introduction' ? (
              <textarea
                value={editFormData.value || ''}
                onChange={(e) => setEditFormData({ ...editFormData, value: e.target.value })}
                placeholder="Write a brief introduction about yourself"
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  fontSize: '1rem',
                  border: '1px solid #dadce0',
                  borderRadius: '4px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            ) : (
              <input
                type="text"
                value={editFormData.value || ''}
                onChange={(e) => setEditFormData({ ...editFormData, value: e.target.value })}
                placeholder={
                  editFormData.type === 'place' ? 'e.g., New York, USA' :
                  editFormData.type === 'link' ? 'e.g., https://example.com' :
                  editFormData.type === 'profileLink' ? 'e.g., https://linkedin.com/in/yourname' :
                  'e.g., https://github.com/yourname'
                }
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  border: '1px solid #dadce0',
                  borderRadius: '4px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCancelEdit} sx={{ textTransform: 'none', color: '#1a73e8' }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const type = editFormData.type;
                const value = editFormData.value;
                
                if (!value || !value.trim()) {
                  handleCancelEdit();
                  return;
                }

                const updatedAbout = { ...mailGAccountPersonalInfo.about };
                
                if (type === 'place') {
                  updatedAbout.places = [...updatedAbout.places, value];
                } else if (type === 'link') {
                  updatedAbout.links = [...updatedAbout.links, value];
                } else if (type === 'profileLink') {
                  updatedAbout.profileLinks = [...updatedAbout.profileLinks, value];
                } else if (type === 'contributorLink') {
                  updatedAbout.contributorLinks = [...updatedAbout.contributorLinks, value];
                } else if (type === 'introduction') {
                  updatedAbout.introduction = value;
                }
                
                setMailGAccountPersonalInfo({
                  ...mailGAccountPersonalInfo,
                  about: updatedAbout
                });
                
                setActiveView('aboutMe');
                handleCancelEdit();
              }}
              variant="contained" 
              sx={{ textTransform: 'none' }}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Add Work/Education Item Dialog */}
      <Dialog 
        open={editDialogOpen === 'addWorkEducationItem'} 
        onClose={handleCancelEdit} 
        maxWidth="sm" 
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleCancelEdit} sx={{ mr: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: '1.375rem' }}>
              {editFormData.type === 'occupation' && 'Add occupation'}
              {editFormData.type === 'workHistory' && 'Add work history'}
              {editFormData.type === 'educationHistory' && 'Add education history'}
            </Typography>
          </Box>
          
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography sx={{ fontSize: '0.875rem', mb: 2 }}>
              {editFormData.type === 'occupation' ? 'Occupation' : 
               editFormData.type === 'workHistory' ? 'Company/Position' : 'School/Degree'}
            </Typography>
            
            <input
              type="text"
              value={editFormData.value || ''}
              onChange={(e) => setEditFormData({ ...editFormData, value: e.target.value })}
              placeholder={
                editFormData.type === 'occupation' ? 'e.g., Software Engineer' :
                editFormData.type === 'workHistory' ? 'e.g., Google - Senior Developer' :
                'e.g., MIT - Computer Science'
              }
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCancelEdit} sx={{ textTransform: 'none', color: '#1a73e8' }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const type = editFormData.type;
                const value = editFormData.value;
                
                if (!value || !value.trim()) {
                  handleCancelEdit();
                  return;
                }

                const updatedWorkEducation = { ...mailGAccountPersonalInfo.workAndEducation };
                
                if (type === 'occupation') {
                  updatedWorkEducation.occupation = value;
                } else if (type === 'workHistory') {
                  updatedWorkEducation.workHistory = [...updatedWorkEducation.workHistory, value];
                } else if (type === 'educationHistory') {
                  updatedWorkEducation.educationHistory = [...updatedWorkEducation.educationHistory, value];
                }
                
                setMailGAccountPersonalInfo({
                  ...mailGAccountPersonalInfo,
                  workAndEducation: updatedWorkEducation
                });
                
                setActiveView('aboutMe');
                handleCancelEdit();
              }}
              variant="contained" 
              sx={{ textTransform: 'none' }}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Visibility Edit Dialogs */}
      <Dialog 
        open={editDialogOpen === 'nameVisibility' || editDialogOpen === 'genderVisibility' || editDialogOpen === 'birthdayVisibility' || editDialogOpen === 'emailVisibility' || editDialogOpen === 'profilePictureVisibility' || editDialogOpen === 'linksVisibility' || editDialogOpen === 'workVisibility' || editDialogOpen === 'educationVisibility'} 
        onClose={handleCancelEdit} 
        maxWidth="sm" 
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleCancelEdit} sx={{ mr: 2 }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: '1.375rem' }}>
              {editDialogOpen === 'nameVisibility' && 'Name visibility'}
              {editDialogOpen === 'genderVisibility' && 'Gender visibility'}
              {editDialogOpen === 'birthdayVisibility' && 'Birthday visibility'}
              {editDialogOpen === 'emailVisibility' && 'Email visibility'}
              {editDialogOpen === 'profilePictureVisibility' && 'Profile picture visibility'}
              {editDialogOpen === 'linksVisibility' && 'Links visibility'}
              {editDialogOpen === 'workVisibility' && 'Work visibility'}
              {editDialogOpen === 'educationVisibility' && 'Education visibility'}
            </Typography>
          </Box>
          
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 3 }}>
            Choose who can see this information
          </Typography>

          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
            {/* Only you option */}
            <Box 
              onClick={() => setEditFormData({ ...editFormData, value: 'onlyYou' })}
              sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                bgcolor: editFormData.value === 'onlyYou' ? '#e8f0fe' : 'transparent',
                '&:hover': { bgcolor: editFormData.value === 'onlyYou' ? '#e8f0fe' : '#f5f5f5' }
              }}
            >
              <Box sx={{ 
                width: 20, 
                height: 20, 
                borderRadius: '50%', 
                border: '2px solid',
                borderColor: editFormData.value === 'onlyYou' ? '#1a73e8' : '#5f6368',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                {editFormData.value === 'onlyYou' && (
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#1a73e8' }} />
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <PersonOutlinedIcon sx={{ fontSize: 18, color: '#1a73e8' }} />
                  <Typography sx={{ fontWeight: 500 }}>Only you</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                  Only you can see this information
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Anyone option */}
            <Box 
              onClick={() => setEditFormData({ ...editFormData, value: 'anyone' })}
              sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                bgcolor: editFormData.value === 'anyone' ? '#e8f0fe' : 'transparent',
                '&:hover': { bgcolor: editFormData.value === 'anyone' ? '#e8f0fe' : '#f5f5f5' }
              }}
            >
              <Box sx={{ 
                width: 20, 
                height: 20, 
                borderRadius: '50%', 
                border: '2px solid',
                borderColor: editFormData.value === 'anyone' ? '#1a73e8' : '#5f6368',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                {editFormData.value === 'anyone' && (
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#1a73e8' }} />
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <GroupsOutlinedIcon sx={{ fontSize: 18, color: '#1a73e8' }} />
                  <Typography sx={{ fontWeight: 500 }}>Anyone</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                  Anyone can see this information when they interact with you
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCancelEdit} sx={{ textTransform: 'none', color: '#1a73e8' }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              variant="contained" 
              sx={{ textTransform: 'none', bgcolor: '#1a73e8', '&:hover': { bgcolor: '#1557b0' } }}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Dialog>
  );
}


